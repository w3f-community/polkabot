import 'babel-core/register'
import 'babel-polyfill'
import Olm from 'olm'
import config from './config'
import minimongo from 'minimongo'
import createApi from '@polkadot/api'
import WsProvider from '@polkadot/api-provider/ws'
import pkg from '../package.json'
import PluginScanner from './lib/plugin-scanner'
import PluginLoader from './lib/plugin-loader'

global.Olm = Olm
const sdk = require('matrix-js-sdk')

console.log(`Connecting to ${config.polkadot.host}`)
const provider = new WsProvider(config.polkadot.host)
const polkadot = createApi(provider)

const LocalDb = minimongo.MemoryDb
const db = new LocalDb()
db.addCollection('config')

db.config.upsert({ master: config.matrix.master }, () => {
  db.config.findOne({}, {}, function (res) {
    console.log('Master is : ' + res.master)
  })
})

var matrix = sdk.createClient({
  baseUrl: 'https://matrix.org',
  accessToken: config.matrix.token,
  userId: config.matrix.userId
})

// comment out if you need to trouble shoot matrix issues
// matrix.on('event', function (event) {
//   console.log(event.getType())
// })

function loadPlugins () {
  console.log('Loading plugins:')
  const pluginScanner = new PluginScanner(pkg.name + '-plugin')

  pluginScanner.scan((err, module) => {
    if (err) console.error(err)
    const pluginLoader = new PluginLoader(module)
    pluginLoader.load(Plugin => {
      let plugin = new Plugin({
        config,
        db,
        matrix,
        polkadot })
      plugin.start()
    })
  }, (err, all) => {
    if (err) console.error(err)
    if (all.length === 0) { console.log('Polkabot does not do much without plugin, make sure you install at least one') }
  })
}

function start () {
  loadPlugins()
  console.log(`${pkg.name} v${pkg.version} started`)
}

matrix.on('sync', function (state, prevState, data) {
  switch (state) {
    case 'PREPARED':
      start()
      break
  }
})

matrix.on('RoomMember.membership', function (event, member) {
  if (member.membership === 'invite' && member.userId === config.userId) {
    matrix.joinRoom(member.roomId).done(() => {
      console.log('Auto-joined %s', member.roomId)
      matrix.sendTextMessage(
        member.roomId,
        `Hi there!`)
    })
  }
})

const MESSAGES_TO_SHOW = 20
matrix.startClient(MESSAGES_TO_SHOW)
