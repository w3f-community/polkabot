/* eslint-disable @typescript-eslint/no-var-requires */
import * as path from "path";
import * as fs from "fs";
import { PluginModule,PluginContext, PolkabotPlugin } from "../../../polkabot-api/src/plugin.interface";

interface Author  {
  name: string | { name: string };
}

// TODO move that away!
interface PackageJson {
  name: string;
  version: string;
  author: Author;
}

export default class PluginLoader {
  public static async load(f: PluginModule, context: PluginContext): Promise<PolkabotPlugin> {
    console.log("PluginLoader - Load(...)");
    
    return new Promise((resolve, _reject) => {
      // console.log('loading ', this.plugin.path)
      fs.realpath(f.path, async (err, pluginPath) => {
        if (err) console.log("ERR:", err);
  
        
        // try {
          const myModule = (await import(pluginPath)).default;
          // const myModule = await import("./polkabot-plugin-blocthday");
          // // const myModule = {}
          // console.log(myModule);
          
          const plugin: PolkabotPlugin = new myModule(context);
          // console.log(plugin);
          
          const pkg: PackageJson = require(path.join(pluginPath, "package.json")); // TODO, we should attach the info to the plugin itself
          
          // //@ts-ignore
          console.log(` - ${pkg.name} version ${pkg.version} from ${pkg.author.name || pkg.author}`);
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
