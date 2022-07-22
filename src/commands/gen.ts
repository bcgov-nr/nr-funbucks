import * as fs from 'fs';
import * as path from 'path';

import {Command, Flags} from '@oclif/core';
import {RenderService} from '../services/render.service';
import {ServerConfig} from '../util/types';
import {SERVER_CONFIG_BASEPATH} from '../constants/paths';
import {FB_FILTER_LIMIT, FB_INPUT_LIMIT, FB_PARSER_LIMIT} from '../constants/limits';

/**
 * Generate command for funbucks
 */
export default class Gen extends Command {
  static description = 'generate fluentbit configuration';

  static examples = [
    '<%= config.bin %> <%= command.id %>',
  ];

  static flags = {
    server: Flags.string({char: 's', required: true, description: 'server to render the config for'}),
    local: Flags.boolean({char: 'l', description: 'render for local lambda usage'}),
    app: Flags.string({char: 'a', description: 'app to limit rendering to'}),
    context: Flags.string({
      char: 'c',
      multiple: true,
      default: [],
      description: 'context override. Examples: appPathJq//tmp/jq, deploy_1:inputPath//tmp/file',
    }),
    multiple: Flags.boolean({
      char: 'm',
      description: 'render output in multiple agents if necessary',
    }),
  };

  /**
   * Generate command
   */
  public async run(): Promise<void> {
    const {flags} = await this.parse(Gen);
    const serverConfigStr = fs.readFileSync(path.resolve(SERVER_CONFIG_BASEPATH, `${flags.server}.json`), 'utf8');
    const serverConfig: ServerConfig = JSON.parse(serverConfigStr);
    let agentCount = 0;

    // Tidy up from previous runs
    await RenderService.clean();

    const serviceArr: RenderService[] = [];

    for (const app of serverConfig.apps) {
      if (serviceArr.length <= agentCount) {
        serviceArr.push(new RenderService(flags.multiple ? `fluent-bit.${agentCount}` : ''));
        await serviceArr[agentCount].init(flags.local);
        if (!flags.local && !serverConfig.disableFluentBitMetrics) {
          // Add fluent bit metrics for every agent
          serviceArr[agentCount].writeApp({
            id: `metrics_fluentbit_process`,
            type: 'metric_s6_process',
            context: {
              'app': 'fluentbit',
              'component': `fluent-bit.${agentCount}`,
            },
          }, serverConfig, flags.context);
        }
      }
      if (flags.app === undefined || flags.app === app.id) {
        // Write app config
        serviceArr[agentCount].writeApp(app, serverConfig, flags.context);
      }

      if (flags.multiple && (serviceArr[agentCount].inputCount > FB_INPUT_LIMIT ||
        serviceArr[agentCount].filterCount > FB_FILTER_LIMIT ||
        serviceArr[agentCount].parserCount > FB_PARSER_LIMIT)) {
        agentCount++;
      }
    }
    // Write base config (should occur last)
    for (const [index, service] of serviceArr.entries()) {
      service.writeBase(serverConfig, [`agentCount/${index}`, ...flags.context]);
    }
  }
}
