#!/usr/bin/env node
import Plugin from '../../lib/lib'

module.exports = class Operator extends Plugin {
  constructor (matrix) {
    super(matrix)
    this.name = 'Operator'
    this.version = '0.0.1'

    matrix.on('Room.timeline', function (event, room, toStartOfTimeline) {
      if (event.getType() !== 'm.room.message') {
        return
      }

      function isPrivate (sender, room) {
        return (sender === `@${room.name}:matrix.org`)
      }

      const isOperator = (sender) => sender === '@chevdor:matrix.org'

      if (isPrivate(event.getSender(), room) && isOperator(event.getSender())) {
        const msg = event.getContent().body

        matrix.sendTextMessage(
          '!dCkmWIgUWtONXbANNc:matrix.org',
          'OP: your command is ' + msg).finally(function () {
          })
      }
    })
  }
}
