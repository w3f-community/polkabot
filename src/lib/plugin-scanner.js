var path = require('path')
var fs = require('fs')

export default class PluginScanner {
  constructor (name) {
    this.name = name
  }

  scan (cb, done) {
    const basepath = path.join(path.dirname(process.argv0), '../lib/node_modules')
    var modules = []

    fs.readdir(basepath, (err, items) => {
      if (err) console.error(err)
      done(null, items
        .filter(i => i.indexOf(this.name) === 0)
        .map((plugin) => {
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
