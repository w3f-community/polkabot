var path = require('path')
const fs = require('fs')

export default class PluginLoader {
  constructor (plugin) {
    this.plugin = plugin
  }

  load (cb) {
    // console.log('loading ', this.plugin.path)
    fs.realpath(this.plugin.path, (err, pluginPath) => {
      if (err) console.log('ERR:', err)
      // console.log('Resolved ' + this.plugin.path + ' to ' + pluginPath)

      const plugin = require(pluginPath)
      const pkg = require(path.join(pluginPath, 'package.json'))
      console.log(` - ${pkg.name} version ${pkg.version} from ${pkg.author.name || pkg.author}`)
      // console.log(` - path: ${this.plugin.path}`)
      cb(plugin)
    })
  }
}
