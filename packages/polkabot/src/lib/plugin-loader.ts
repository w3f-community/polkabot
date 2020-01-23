/* eslint-disable @typescript-eslint/no-var-requires */
import * as fs from "fs";
import { PluginModule, PluginContext, PolkabotPlugin } from "../../../polkabot-api/src/plugin.interface";

export default class PluginLoader {
  public static async load(mod: PluginModule, context: PluginContext): Promise<PolkabotPlugin> {
    console.log(`XXX Loading ${mod.name} from ${mod.path}`)
    return new Promise((resolve, _reject) => {
      // console.log('loading ', this.plugin.path)
      fs.realpath(mod.path, async (err, pluginPath) => {
        if (err) console.log("ERR:", err);

        // try {
        const myModule = (await import(pluginPath)).default;
        const plugin: PolkabotPlugin = new myModule(mod, context);
        // console.log(plugin);

        console.log(
          ` - ${plugin.package.name} version ${plugin.package.version} from ${plugin.package.author.name ||
            plugin.package.author}`
        );
        // console.log(` - ${plugin.module.package.name} version ${plugin.module.package.version}`);
        // // console.log(` - path: ${this.plugin.path}`)
        resolve(plugin);
        // reject('make it work')
        // } catch (e) {
        //   reject(e)
        // }
      });
    });
  }
}
