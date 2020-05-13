/* eslint-disable @typescript-eslint/no-var-requires */
import * as fs from 'fs';
import {
  PluginModule,
  PluginContext,
  PolkabotPlugin,
} from '../../../polkabot-api/src/plugin.interface';
import { PolkabotNotifier } from '../../../polkabot-api/src/PolkabotNotifier';
import { PolkabotWorker } from '../../../polkabot-api/src/PolkabotWorker';
import { PolkabotChatbot } from '../../../polkabot-api/src/PolkabotChatbot';
import LoggerSingleton from '../../../polkabot-api/src/logger';

const Logger = LoggerSingleton.getInstance();

export default class PluginLoader {
  public static async load(mod: PluginModule, context: PluginContext): Promise<PolkabotPlugin> {
    Logger.debug(` - Loading ${mod.name} from ${mod.path}`);
    return new Promise((resolve, _reject) => {
      fs.realpath(mod.path, async (err, pluginPath) => {
        if (err) Logger.error('ERR:', err);

        const myModule = (await import(pluginPath)).default;
        let plugin;
        const parentClass = Object.getPrototypeOf(myModule).name;

        switch (parentClass) {
          case PolkabotNotifier.name:
            plugin = new myModule(mod, context) as PolkabotNotifier;
            break;
          case PolkabotWorker.name:
            plugin = new myModule(mod, context) as PolkabotWorker;
            break;
          case PolkabotChatbot.name:
            plugin = new myModule(mod, context) as PolkabotChatbot;
            break;
          default:
            throw new Error('Plugin type not supported');
        }

        Logger.info(
          ` - ${plugin.constructor.name}: ${plugin.package.name} version ${plugin.package.version} from ${plugin.package.author
            .name || plugin.package.author}`
        );

        resolve(plugin);
      });
    });
  }
}
