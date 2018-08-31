
export default class PluginLoader {
  constructor (plugin) {
    this.plugin = plugin
  }

  load (cb) {
    console.log('loading plugin: ' + this.plugin.name)
    cb(require(this.plugin.path))
  }
}
