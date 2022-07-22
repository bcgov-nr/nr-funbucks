import * as fs from 'fs';
import * as path from 'path';
import * as nunjucks from 'nunjucks';
import * as semver from 'semver';

import {CONFIG_BASEPATH, OUTPUT_BASEPATH, TEMPLATE_CONFIG_BASEPATH} from '../constants/paths';
// eslint-disable-next-line max-len
import {BaseConfig, FbFile, FB_FILE_TYPES, MEASURE_TYPES, ServerAppConfig, ServerConfig, TypeConfig} from '../util/types';

/**
 * The render service handles most tasks around templating and writing the fluent bit configuration.
 */
export class RenderService {
  /**
   * Base config
   */
  private baseConfig: BaseConfig = {
    context: {},
    localContextOverride: {},
    files: [],
  };

  /**
   * Context override values
   */
  private baseContextOverride: object = {};

  /**
   * Keeps count of times a type has been created.
   */
  private typeCnt: {
    [type: string]: number
  } = {};

  /**
   * Keeps track of files.
   */
  private typeFiles: {
    [type: string]: string[]
  } = {};

  /**
   * Keeps track of types of each measurement.
   */
  private measureTypes: {
    [Property in keyof MEASURE_TYPES]: string[];
  } = {
      historic: [],
      instant: [],
    };

  /**
   * The set of ids
   */
  private idSet = new Set<string>();

  private _inputCount = 0;
  private _filterCount = 0;
  private _parserCount = 0;

  get inputCount() {
    return this._inputCount;
  }

  get filterCount() {
    return this._filterCount;
  }

  get parserCount() {
    return this._parserCount;
  }

  constructor(private agentBasePath: string = '') {

  }

  /**
   * Initializes the output directory and reads base config.
   * @param local If true, the local context override in the base config is used.
   * @returns Promise resolved when initialization is complete
   */
  public async init(local: boolean): Promise<void> {
    nunjucks.configure(TEMPLATE_CONFIG_BASEPATH, {
      autoescape: true,
    });
    if (this.agentBasePath !== '') {
      fs.mkdirSync(path.resolve(OUTPUT_BASEPATH, this.agentBasePath));
    }
    return this.readBaseConfig(local);
  }

  /**
   * Cleans output path
   * @returns Promise resolved when everything cleaned
   */
  public static clean(): Promise<void> {
    fs.rmSync(OUTPUT_BASEPATH, {recursive: true, force: true});
    fs.mkdirSync(OUTPUT_BASEPATH);
    return Promise.resolve();
  }

  /**
   * Reads the base config
   * @param local If true, the local context override in the base config is used.
   * @returns Promise resolved when base config read.
   */
  public readBaseConfig(local: boolean): Promise<void> {
    const baseConfigStr = fs.readFileSync(path.resolve(CONFIG_BASEPATH, `base.json`), 'utf8');
    this.baseConfig = JSON.parse(baseConfigStr);
    if (local) {
      this.baseContextOverride = this.baseConfig.localContextOverride;
    }
    return Promise.resolve();
  }

  /**
   * Write base config. This should be done last.
   * @param override Array of override values
   */
  public writeBase(serverConfig: ServerConfig, override: string[]) {
    const context = {
      ...this.baseConfig.context,
      ...this.baseContextOverride,
      ...serverConfig.context,
      ...this.overrideContext(override, undefined),
      ...this.collateFileType('parser'),
      ...this.collateFileType('filter'),
      ...this.collateFileType('input'),
      measureTypes: this.measureTypes,
    };

    for (const file of this.baseConfig.files) {
      this.writeRenderedTemplate(file.tmpl, this.fileToOutputPath(file), file.type, context);
    }

    console.log(`Inputs: ${this.inputCount}`);
    console.log(`Filters: ${this.filterCount}`);
    console.log(`Parsers: ${this.parserCount}`);
  }

  public writeApp(app: ServerAppConfig, serverConfig: ServerConfig, override: string[]) {
    const typeConfigPath = path.resolve(TEMPLATE_CONFIG_BASEPATH, app.type, `${app.type}.json`);
    const typeConfigStr = fs.readFileSync(typeConfigPath, 'utf8');
    const type: TypeConfig = JSON.parse(typeConfigStr);
    // Only write out if semver is statisfied. Default is to accept.
    if (type.semver === undefined || semver.satisfies(serverConfig.fluentBitRelease, type.semver)) {
      this.writeType(app, type, serverConfig, override);
    }
  }

  /**
   * Write app out from type template on server
   * @param app The application to write the configuration for
   * @param type The type to use to template the application
   * @param serverConfig The server the app resides on
   * @param override Array of override values
   */
  private writeType(
    app: ServerAppConfig,
    type: TypeConfig,
    serverConfig: ServerConfig,
    override: string[]) {
    const context = {...type.context, ...app.context};
    this.typeCnt[app.type] = this.typeCnt[app.type] ? this.typeCnt[app.type] + 1 : 1;
    const paddedTypeCnt = `${this.typeCnt[app.type]}`.padStart(4, '0');
    const typeTag = app.id ? app.id : `${app.type}_${paddedTypeCnt}`;
    if (this.idSet.has(typeTag)) {
      throw new Error('Duplicate id. Please fix configuration.');
    }
    this.idSet.add(typeTag);
    this.measureTypes[type.measurementType].push(typeTag);
    for (const file of type.files) {
      const {outPath, outRelativePath} = this.writeRenderedTemplate(
        `${app.type}/${file.tmpl}`,
        `${typeTag}/${this.fileToOutputPath(file)}`,
        file.type,
        {
          typeTag,
          ...this.baseConfig.context,
          ...this.baseContextOverride,
          ...serverConfig.context,
          ...context,
          ...this.overrideContext(override, typeTag),
        });

      if (file.type === 'script') {
        fs.chmodSync(outPath, 0o775);
      }
      this.addFileToType(app, file, outRelativePath);
    }
  }

  /**
   * Renders any values using nunjucks if the key starts with '!'
   * @param context The context to render
   * @returns The modified context
   */
  private execValueTemplate(context: {[key: string]: string}): object {
    for (const key of Object.keys(context)) {
      if (key && key.length > 1 && key.startsWith('!')) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        context[key.slice(1)] = nunjucks.renderString(context[key], context);
      }
    }
    return context;
  }

  /**
   * Renders override values into a context object. Key is seperated from value with a '/'.
   * If there is a ':' in the key it is interpreted as an override for a specific application.
   * @param override Array of override values
   * @param typeTag Optional type tag for overriding specific application context values
   * @returns
   */
  private overrideContext(override: string[], typeTag?: string): object {
    return {
      ...override.filter((s) => s.indexOf('/') !== -1).reduce((acc, cv) => {
        const slashIndex = cv.indexOf('/');
        const typeKey = cv.substring(0, slashIndex);
        const val = cv.substring(slashIndex + 1);

        if (typeKey.indexOf(':') === -1) {
          acc[typeKey] = val;
          return acc;
        }

        const colonIndex = typeKey.indexOf(':');
        const type = typeKey.substring(0, colonIndex);
        const key = typeKey.substring(colonIndex + 1);
        if (type === typeTag) {
          acc[key] = val;
        }
        return acc;
      }, {} as {[type: string]: string}),
    };
  }

  /**
   * Gathers all files of fileType into a context object
   * @param fileType The file type to collect
   * @returns Context object
   */
  private collateFileType(fileType: FB_FILE_TYPES): object {
    return {
      // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
      [`files_${fileType}`]: this.typeFiles[fileType] ? this.typeFiles[fileType] : [],
    };
  }

  /**
   * Add file to type library for later collation for templating.
   */
  private addFileToType(app: ServerAppConfig, file: FbFile, outPath: string): void {
    if (!this.typeFiles[file.type]) {
      this.typeFiles[file.type] = [];
    }
    this.typeFiles[file.type].push(outPath.slice(OUTPUT_BASEPATH.length + 1));
  }

  /**
   * Renders a template out using Nunjucks.
   * @param templateName The path to the template to render
   * @param outputPath The output path
   * @param context The context to render the template using
   * @returns The output path
   */
  private writeRenderedTemplate(
    templateName: string,
    outputPath: string,
    fileType: FB_FILE_TYPES,
    context: object): {outPath: string, outRelativePath: string} {
    const outPath = path.resolve(OUTPUT_BASEPATH, this.agentBasePath, outputPath);
    const outRelativePath = path.resolve(OUTPUT_BASEPATH, outputPath);
    fs.mkdirSync(path.dirname(outPath), {recursive: true});
    if (this.isTemplateNjkFile(templateName)) {
      const txt = nunjucks.render(templateName, this.execValueTemplate(context as {[key: string]: string}));
      this.updateLimitCounts(fileType, txt);
      fs.writeFileSync(outPath, txt);
    } else {
      const txt = fs.readFileSync(path.resolve(TEMPLATE_CONFIG_BASEPATH, templateName), 'utf-8');
      this.updateLimitCounts(fileType, txt);
      fs.writeFileSync(outPath, txt);
    }
    return {outPath, outRelativePath};
  }

  private updateLimitCounts(fileType: FB_FILE_TYPES, txt: string) {
    if (fileType === 'input') {
      this._inputCount += (txt.match(/\[input\]/ig) || []).length;
    } else if (fileType === 'filter') {
      this._filterCount += (txt.match(/\[filter\]/ig) || []).length;
    } else if (fileType === 'parser') {
      this._parserCount += (txt.match(/\[(multiline_)?parser\]/ig) || []).length;
    }
  }

  /**
   * Resolves a file to its output path.
   * @param file The file to resolve the output path for
   * @returns The output path
   */
  private fileToOutputPath(file: FbFile): string {
    if (file.name !== undefined) {
      return file.name;
    } else if (this.isTemplateNjkFile(file.tmpl)) {
      return file.tmpl.substring(0, file.tmpl.length - 4);
    } else {
      return file.tmpl;
    }
  }

  /**
   * Checks if the path is a nunjucks template.
   * @param path The path to check
   * @returns True if the path ends in .njk and false otherwise
   */
  private isTemplateNjkFile(path: string): boolean {
    return path.endsWith('.njk');
  }
}
