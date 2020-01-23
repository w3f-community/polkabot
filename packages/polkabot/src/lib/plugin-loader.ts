/* eslint-disable @typescript-eslint/no-var-requires */
import * as fs from "fs";
import {
  PluginModule,
  PluginContext,
  PolkabotPlugin,
  PolkabotNotifier,
  PolkabotWorker,
  } from "../../../polkabot-api/src/plugin.interface";

export default class PluginLoader {
  // private static getType(mod: PluginModule) {
  //   // TODO this is not a great option, the type should be part of the plugin and not guessed from the name
  //   if (mod.name.includes("notifier")) return PolkabotNotifier.name;
  //   return PolkabotWorker.name;
  // }

  public static async load(mod: PluginModule, context: PluginContext): Promise<PolkabotPlugin> {
    console.log(`Loading ${mod.name} from ${mod.path}`);
    return new Promise((resolve, _reject) => {
      fs.realpath(mod.path, async (err, pluginPath) => {
        if (err) console.log("ERR:", err);

        const myModule = (await import(pluginPath)).default;
        let plugin;

        // let test = new myModule(mod, context)
         
        const parentClass = Object.getPrototypeOf(myModule).name
        // console.log('+++',PolkabotNotifier.name);
        
        switch (parentClass) {
          case PolkabotNotifier.name:
            plugin = new myModule(mod, context) as PolkabotNotifier 
            break;
          case PolkabotWorker.name:
            plugin = new myModule(mod, context) as PolkabotWorker
            break;

          default:
            throw new Error("Plugin type not supported");
        }

        console.log(
          ` - ${plugin.constructor.name}: ${plugin.package.name} version ${plugin.package.version} from ${plugin
            .package.author.name || plugin.package.author}`
        );

        resolve(plugin);
      });
    });
  }
}
