import 'babel-core/register'
import 'babel-polyfill'
import Olm from 'olm'
import config from './config'
import minimongo from 'minimongo'
import createApi from '@polkadot/api'
import WsProvider from '@polkadot/api-provider/ws'
import pkg from '../package.json'

import Plugins from 'js-plugins'
const pluginManager = new Plugins()

global.Olm = Olm
const sdk = require('matrix-js-sdk')

console.log(`Connecting to ${config.polkadot.host}`)
console.log(`Operating as ${config.matrix.userId}`)

const provider = new WsProvider(config.polkadot.host)
const polkadot = createApi(provider)

const LocalDb = minimongo.MemoryDb
const db = new LocalDb()
db.addCollection('accounts')
db.addCollection('config')

db.config.upsert({ master: config.matrix.master }, () => {
  db.config.findOne({}, {}, function (res) {
    console.log('Master is : ' + res.master)
  })
})

const matrix = sdk.createClient({
  baseUrl: 'https://matrix.org',
  accessToken: config.matrix.token,
  userId: config.matrix.userId
})

matrix.on('event', function (event) {
  // comment out if you need to trouble shoot
  // console.log(event.getType())
})

function loadPlugins () {
  console.log('Loading plugins:')
  // let nbPlugins = 0
  // config.plugins
  //   .filter(plugin => plugin.enabled)
  //   .map(plugin => {
  //     let Plugin = require('./plugins/' + plugin.name)
  //     let p = new Plugin(
  //       plugin.name,
  //       config,
  //       matrix,
  //       polkadot)
  //     console.log(' - ' + plugin.name)
  //     p.start()
  //     nbPlugins++
  //   })
  // if (!nbPlugins) console.error('Polkabot could not find any plugin, it needs at least one to be useful')
  // console.log(pluginManager)
  // pluginManager.scan()

  pluginManager.scanSubdirs(['../'])
  const extensionPoint = 'polkabot:plugin'

  // pluginManager.register(extensionPoint, 'blocthday', null)

  pluginManager
    .connect({ iam: 'host' },
      extensionPoint, {
        data: { config, matrix, polkadot },
        multi: true,
        name: 'blocthday',
        required: true
      }, (err, instance) => {
        if (err) console.log(err)
        console.log(instance)
      })
}

function start () {
  loadPlugins()

  console.log(`${pkg.name} v${pkg.version} started`)

  // matrix.sendTextMessage(
  //   config.matrix.room,
  //   `${pkg.name} v${pkg.version} started`)
  // .finally(() => {
  // })
}

matrix.on('sync', function (state, prevState, data) {
  // console.log(state, data)
  switch (state) {
    case 'PREPARED':
      console.log('Matrix state: PREPARED')
      start()
      break
    case 'ERROR':
      console.error(data)
  }
})

matrix.on('RoomMember.typing', function (event, member) {
  // if (member.typing) {
  //   // console.log(member.name + ' is typing...')
  // } else {
  //   // console.log(member.name + ' stopped typing.')
  // }
})

matrix.on('RoomMember.membership', function (event, member) {
  if (member.membership === 'invite' && member.userId === config.userId) {
    matrix.joinRoom(member.roomId).done(function () {
      console.log('Auto-joined %s', member.roomId)
    })
  }
})

matrix.on('Room.timeline', function (event, room, toStartOfTimeline) {
  if (toStartOfTimeline) {
    return // don't print paginated results
  }

  if (event.getType() !== 'm.room.message') {
    // console.log('EVENT:', event)

  }

  // console.log(event)
  // console.log('(%s) %s \t: %s', room.name, '*** master ***', event.getContent().body)
})

matrix.startClient(config.matrix.MESSAGES_TO_SHOW)
