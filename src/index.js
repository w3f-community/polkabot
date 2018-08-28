import 'babel-core/register'
import 'babel-polyfill'
import Olm from 'olm'
import config from './config'
import minimongo from 'minimongo'
import createApi from '@polkadot/api'
import WsProvider from '@polkadot/api-provider/ws'
import pkg from '../package.json'

global.Olm = Olm
const sdk = require('matrix-js-sdk')

console.log(`Connecting to ${config.polkadot.host}`)
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

var matrix = sdk.createClient({
  baseUrl: 'https://matrix.org',
  accessToken: config.token,
  userId: config.userId
})

matrix.on('event', function (event) {
  // comment out if you need to trouble shoot
  // console.log(event.getType())
})

function loadPlugins () {
  console.log('Loading plugins:')
  config.plugins
    .filter(plugin => plugin.enabled)
    .map(plugin => {
      let Plugin = require('./plugins/' + plugin.name)
      let p = new Plugin(matrix, polkadot)
      console.log(' - ' + plugin.name)
    })
}

function start () {
  loadPlugins()

  console.log(`${pkg.name} v${pkg.version} started`)

  // matrix.sendTextMessage(
  //   '!dCkmWIgUWtONXbANNc:matrix.org',
  //   `${pkg.name} v${pkg.version} started`)
  // .finally(() => {
  // })
}

matrix.on('sync', function (state, prevState, data) {
  // console.log(state, data)
  switch (state) {
    case 'PREPARED':
      start()
      break
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

const MESSAGES_TO_SHOW = 20
matrix.startClient(MESSAGES_TO_SHOW)
