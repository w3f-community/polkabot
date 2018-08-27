import 'babel-core/register'
import 'babel-polyfill'
import Olm from 'olm'
import config from './config'
import minimongo from 'minimongo'
import createApi from '@polkadot/api'
import HttpProvider from '@polkadot/api-provider/http'
// import { Hash } from '@polkadot/primitives/base'
import BN from 'bn.js'

global.Olm = Olm
const sdk = require('matrix-js-sdk')

const provider = new HttpProvider('http://127.0.0.1:9933')
const api = createApi(provider)

const LocalDb = minimongo.MemoryDb
const db = new LocalDb()
db.addCollection('accounts')
db.addCollection('config')

var master

db.config.upsert({ master: '@chevdor:matrix.org' }, () => {
  db.config.findOne({ }, {}, function (res) {
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

client.on('sync', function (state, prevState, data) {
  // console.log(state, data)
})

client.on('RoomMember.typing', function (event, member) {
  if (member.typing) {
    // console.log(member.name + ' is typing...')
  } else {
    // console.log(member.name + ' stopped typing.')
  }
})

client.on('RoomMember.membership', function (event, member) {
  if (member.membership === 'invite' && member.userId === config.userId) {
    client.joinRoom(member.roomId).done(function () {
      console.log('Auto-joined %s', member.roomId)
    })
  }
})

function isPrivate (sender, room) {
  // console.log('sender:', sender, 'room', room.name)
  return (sender === `@${room.name}:matrix.org`)
}

client.on('Room.timeline', function (event, room, toStartOfTimeline) {
  if (toStartOfTimeline) {
    return // don't print paginated results
  }

  if (event.getType() !== 'm.room.message') {
    console.log('EVENT:', event)
    return
  }

  // console.log(event)
  const priv = isPrivate(event.getSender(), room)

  if (event.getSender() === master) {
    console.log('%s (%s) %s \t: %s', priv ? 'PRI' : '   ', room.name, '*** master ***', event.getContent().body)
  } else {
    console.log('%s (%s) %s \t: %s', priv ? 'PRI' : '   ', room.name, event.getSender(), event.getContent().body)
  }
})

client.startClient()

function poll () {
  api.chain
    .getHead()
    .then((hash) => api.chain.getHeader(hash))
    .then(header => {
      const bnBlockNumber = new BN(header.number, 16)
      console.log(bnBlockNumber.toString(10))
      if (bnBlockNumber.mod(new BN(10)).toString(10) === '0') { console.log('Happy Block Day') }
    })
    .catch((error) => console.error(error))
}

setInterval(poll, 2500)
