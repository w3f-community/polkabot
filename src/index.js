import 'babel-core/register'
import 'babel-polyfill'

import sdk from 'matrix-js-sdk'
import config from './config'

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

client.on('Room.timeline', function (event, room, toStartOfTimeline) {
  if (toStartOfTimeline) {
    return // don't print paginated results
  }
  if (event.getType() !== 'm.room.message') {
    return // only print messages
  }
  console.log(
    // the room name will update with m.room.name events automatically
    '(%s) %s \t: %s', room.name, event.getSender(), event.getContent().body
  )
})

client.startClient()
