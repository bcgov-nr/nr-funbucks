import * as fs from 'fs';
import * as path from 'path';

import { RenderService } from './render.service';
import {
  FB_FILTER_LIMIT,
  FB_INPUT_LIMIT,
  FB_PARSER_LIMIT,
} from '../constants/limits';
import { ServerConfig } from '../util/types';
import { SERVER_CONFIG_BASEPATH } from '../constants/paths';

interface GeneratorOptions {
  server: string;
  local: boolean;
  app?: string;
  context: string[];
  multiple: boolean;
  skipOutput?: boolean;
}

export class GeneratorService {
  public async generate(flags: GeneratorOptions) {
    const serverConfigStr = fs.readFileSync(
      path.resolve(SERVER_CONFIG_BASEPATH, `${flags.server}.json`),
      'utf8',
    );
    const serverConfig: ServerConfig = JSON.parse(serverConfigStr);
    let agentCount = 0;

    // Tidy up from previous runs
    await RenderService.clean();

    const serviceArr: RenderService[] = [];

    for (const app of serverConfig.apps) {
      if (serviceArr.length <= agentCount) {
        serviceArr.push(
          new RenderService(flags.multiple ? `fluent-bit.${agentCount}` : ''),
        );
        await serviceArr[agentCount].init(flags.local);
        // Add fluent bit metrics for every agent
        serviceArr[agentCount].writeApp(
          {
            id: `metrics_otel_fluentbit`,
            type: 'metric_otel_fluentbit',
            context: {
              app: 'fluentbit',
              component: `fluent-bit.${agentCount}`,
              childProcess: true,
              agentCount,
            },
          },
          serverConfig,
          flags.context,
          flags.skipOutput ?? false,
        );
        if (!flags.local && !serverConfig.disableFluentBitMetrics) {
          serviceArr[agentCount].writeApp(
            {
              id: `metrics_fluentbit_process`,
              type: 'metric_s6_process',
              context: {
                app: 'fluentbit',
                component: `fluent-bit.${agentCount}`,
                childProcess: true,
              },
            },
            serverConfig,
            flags.context,
            flags.skipOutput ?? false,
          );
          serviceArr[agentCount].writeApp(
            {
              id: `metric_process_windows`,
              type: 'metric_process_windows',
              context: {
                app: 'fluentbit',
                component: `fluent-bit.${agentCount}`,
                childProcess: true,
              },
            },
            serverConfig,
            flags.context,
            flags.skipOutput ?? false,
          );
        }
      }
      if (flags.app === undefined || flags.app === app.id) {
        // Write app config
        serviceArr[agentCount].writeApp(
          app,
          serverConfig,
          flags.context,
          flags.skipOutput ?? false,
        );
      }

      if (
        flags.multiple &&
        (serviceArr[agentCount].inputCount > FB_INPUT_LIMIT ||
          serviceArr[agentCount].filterCount > FB_FILTER_LIMIT ||
          serviceArr[agentCount].parserCount > FB_PARSER_LIMIT)
      ) {
        agentCount++;
      }
    }
    // Write base config (should occur last)
    for (const [index, service] of serviceArr.entries()) {
      service.writeBase(
        serverConfig,
        [`agentCount/${index}`, ...flags.context],
        flags.skipOutput ?? false,
      );
    }
    return agentCount + 1;
  }
}
