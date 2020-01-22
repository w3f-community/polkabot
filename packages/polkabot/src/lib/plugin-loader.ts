/* eslint-disable @typescript-eslint/no-var-requires */
import * as path from "path";
import * as fs from "fs";
// import IPlugin from "../plugins/Plugin.interface";
import { PluginFile, PluginContext, PolkabotPlugin } from "../types";
// import Blocthday from "polkabot-plugin-blocthday"

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
  // private plugin: IPlugin;

  // public constructor(plugin: IPlugin) {
  //   return new Promise (resolve => {
  //     //this.plugin = plugin;
  //     resolve(plugin)
  //   })
  // }

  public static async load(f: PluginFile, context: PluginContext): Promise<PolkabotPlugin> {
    console.log("PluginLoader - Load(...)");
    return new Promise((resolve, reject) => {
      // console.log('loading ', this.plugin.path)
      fs.realpath(f.path, async (err, pluginPath) => {
        if (err) console.log("ERR:", err);
        // console.log('Resolved ' + this.plugin.path + ' to ' + pluginPath)

        // console.log("Instantiating plugin", pluginPath);
        // pluginPath = pluginPath + '/build'
        // const myModule = require(pluginPath);
        // console.log(myModule);
        
        // console.log('bd test', Blocthday.name)
        try {
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
        } catch (e) {
          reject(e)
        }
      });
    });
  }
}
