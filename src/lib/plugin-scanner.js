var path = require('path')
var fs = require('fs')

export default class PluginScanner {
  constructor (name) {
    this.name = name
  }

  // FIXME - this appears to only be scanning the global npm folder.
  // i.e. where npm modules are installed when you run `npm install -g <PKG_NAME>`
  scan (cb, done) {
    const basepath = path.join(path.dirname(process.argv0), '../lib/node_modules')
    console.log('PluginScanner scanning basepath for Polkabot plugins: ', basepath)
    var modules = []

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
