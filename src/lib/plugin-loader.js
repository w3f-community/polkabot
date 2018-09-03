var path = require('path')

export default class PluginLoader {
  constructor (plugin) {
    this.plugin = plugin
  }

  load (cb) {
    console.log('loading ', this.plugin.path)
    const plugin = require(this.plugin.path)
    const pkg = require(path.join(this.plugin.path, 'package.json'))
    console.log(` - ${pkg.name} version ${pkg.version} from ${pkg.author.name || pkg.author}`)
    // console.log(` - path: ${this.plugin.path}`)
    cb(plugin)
  }
}
