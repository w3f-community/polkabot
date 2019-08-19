import * as path from 'path'
import * as fs from 'fs'

export default class PluginScanner {
  private name: string;
  
  public constructor (name) {
    this.name = name
  }

  public scan (cb, done): void {
    const basepath = path.join(path.dirname(process.argv0), '../lib/node_modules')
    console.log('PluginScanner scanning basepath for Polkabot plugins: ', basepath)
    const modules = []

    fs.readdir(basepath, (err, items) => {
      if (err) console.error(err)
      done(null, items
        .filter(i => i.indexOf(this.name) === 0)
        .map((plugin) => {
          console.log(plugin)
          const mod = {
            name: plugin,
            path: path.join(basepath, plugin)
          }
          modules.push(mod)
          cb(null, mod)
        })
      )
    })
  }
}
