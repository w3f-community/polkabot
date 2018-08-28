import 'babel-core/register'
import 'babel-polyfill'
import Olm from 'olm'
import config from './config'
import minimongo from 'minimongo'
import createApi from '@polkadot/api'
import HttpProvider from '@polkadot/api-provider/http'
import BN from 'bn.js'
import Blocthday from './plugins/Blocthday'
import Operator from './plugins/Operator'
import pkg from '../package.json'

global.Olm = Olm
const sdk = require('matrix-js-sdk')

const provider = new HttpProvider(config.polkadot.host)
const api = createApi(provider)

const LocalDb = minimongo.MemoryDb
const db = new LocalDb()
db.addCollection('accounts')
db.addCollection('config')

var master

db.config.upsert({ master: '@chevdor:matrix.org' }, () => {
  db.config.findOne({}, {}, function (res) {
    console.log('Master is : ' + res.master)
    master = res.master
  })
})

var client = sdk.createClient({
  baseUrl: 'https://matrix.org',
  accessToken: config.token,
  userId: config.userId
})

client.on('event', function (event) {
  // comment out if you need to trouble shoot
  // console.log(event.getType())
})

function loadPlugins () {
  const plugins = [ Blocthday, Operator]
  plugins.map(Plugin => {
    new Plugin(client)
  })
}

function start () {
  loadPlugins()
  client.sendTextMessage(
    '!dCkmWIgUWtONXbANNc:matrix.org',
    `${pkg.name} v${pkg.version} started`)
  .finally(() => {
  })
}

client.on('sync', function (state, prevState, data) {
  // console.log(state, data)
  switch (state) {
    case 'PREPARED':
      start()
      break
  }
})

client.on('RoomMember.typing', function (event, member) {
  // if (member.typing) {
  //   // console.log(member.name + ' is typing...')
  // } else {
  //   // console.log(member.name + ' stopped typing.')
  // }
})

client.on('RoomMember.membership', function (event, member) {
  if (member.membership === 'invite' && member.userId === config.userId) {
    client.joinRoom(member.roomId).done(function () {
      console.log('Auto-joined %s', member.roomId)
    })
  }
})

client.on('Room.timeline', function (event, room, toStartOfTimeline) {
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
client.startClient(MESSAGES_TO_SHOW)

function poll () {
  api.chain
    .getHead()
    .then((hash) => api.chain.getHeader(hash))
    .then(header => {
      const bnBlockNumber = new BN(header.number, 16)
      // console.log(bnBlockNumber.toString(10))
      if (bnBlockNumber.mod(new BN(100)).toString(10) === '0') {
        console.log(`Happy Block Day!!! Polkadot is now at #${bnBlockNumber.toString(10)}`)
        client.sendTextMessage('!dCkmWIgUWtONXbANNc:matrix.org', 'Happy Block day').finally(function () {
        })
      }
    })
    .catch((error) => console.error(error))
}

setInterval(poll, 2500)
