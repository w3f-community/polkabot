import 'babel-core/register'
import 'babel-polyfill'
import Olm from 'olm'
import minimongo from 'minimongo'
import createApi from '@polkadot/api'
import WsProvider from '@polkadot/api-provider/ws'
import pkg from '../package.json'
import PluginScanner from './lib/plugin-scanner'
import PluginLoader from './lib/plugin-loader'
var path = require('path')

global.Olm = Olm
const sdk = require('matrix-js-sdk')

// comment out if you need to trouble shoot matrix issues
// matrix.on('event', function (event) {
//   console.log(event.getType())
// })

export default class Polakbot {
  constructor (args) {
    this.args = args
  }

  loadPlugins () {
    console.log('Loading plugins:')
    const pluginScanner = new PluginScanner(pkg.name + '-plugin')

    pluginScanner.scan((err, module) => {
      if (err) console.error(err)
      const pluginLoader = new PluginLoader(module)
      pluginLoader.load(Plugin => {
        let plugin = new Plugin({
          config: this.config,
          db: this.db,
          matrix: this.matrix,
          polkadot: this.polkadot })
        plugin.start()
      })
    }, (err, all) => {
      if (err) console.error(err)
      console.log()
      if (all.length === 0) { console.log('Polkabot does not do much without plugin, make sure you install at least one') }
    })
  }

  start () {
    this.loadPlugins()
  }

  run () {
    console.log(`${pkg.name} v${pkg.version}`)
    console.log(`===========================`)

    console.log('process', process.cwd())
    console.log('dirname', __dirname)

    const configLocation = this.args.config
      ? this.args.config
      : path.join(__dirname, './config')
    console.log('Config location: ', configLocation)

    this.config = require(configLocation)

    console.log(`Connecting to ${this.config.polkadot.host}`)
    const provider = new WsProvider(this.config.polkadot.host)
    this.polkadot = createApi(provider)

    const LocalDb = minimongo.MemoryDb
    this.db = new LocalDb()
    this.db.addCollection('config')

    this.db.config.upsert({ master: this.config.matrix.master }, () => {
      this.db.config.findOne({}, {}, res => {
        console.log('Master is : ' + res.master)
      })
    })

    this.matrix = sdk.createClient({
      baseUrl: 'https://matrix.org',
      accessToken: this.config.matrix.token,
      userId: this.config.matrix.userId
    })

    this.matrix.on('sync', (state, prevState, data) => {
      switch (state) {
        case 'PREPARED':
          this.start()
          break
      }
    })

    this.matrix.on('RoomMember.membership', (event, member) => {
      if (member.membership === 'invite') {
        // TODO: Fix the following to get the latest activity in the room
        // const roomState = new sdk.RoomState(member.roomId)
        // const inactivityInDays = (new Date() - new Date(roomState._modified)) / 1000 / 60 / 60
        // console.log(roomState.events)

        // if (inactivityInDays < 7) {
        this.matrix.joinRoom(member.roomId).done(() => {
          console.log('Auto-joined %s', member.roomId)
          console.log(` - ${event.event.membership} from ${event.event.sender}`)
          // console.log(` - modified ${new Date(roomState._modified)})`)
          // console.log(` - last activity for ${(inactivityInDays / 24).toFixed(3)} days (${(inactivityInDays).toFixed(2)}h)`)
        })
        // }
      }
    })

    this.matrix.startClient(this.config.matrix.MESSAGES_TO_SHOW || 20)
  }
}
