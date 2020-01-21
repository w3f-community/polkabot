/* eslint-disable @typescript-eslint/no-var-requires */
import * as path from 'path'
import * as fs from 'fs'
import IPlugin from '../plugins/Plugin.interface';

// interface Author  { 
//   name: string; 
// }

interface PackageJson {
  name: string;
  version: string;
  author: string | { name: string } ;
}

export default class PluginLoader {
  private plugin: IPlugin;

  public constructor (plugin: IPlugin) {
    this.plugin = plugin
  }

  public load (cb: Function): void {
    // console.log('loading ', this.plugin.path)
    fs.realpath(this.plugin.path, (err, pluginPath) => {
      if (err) console.log('ERR:', err)
      // console.log('Resolved ' + this.plugin.path + ' to ' + pluginPath)

      
      const plugin: IPlugin = require(pluginPath)
      const pkg: PackageJson = require(path.join(pluginPath, 'package.json'))
    
      //@ts-ignore
      console.log(` - ${pkg.name} version ${pkg.version} from ${pkg.author.name || pkg.author}`)
      // console.log(` - path: ${this.plugin.path}`)
      cb(plugin)
    })
  }
}
