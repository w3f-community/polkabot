#!/usr/bin/env node
import Plugin from '../../lib/lib'
import pluginConfig from './config'

module.exports = class Operator extends Plugin {
  constructor (...args) {
    super(args)
    this.version = '0.0.1'

    this.config[this.name] = pluginConfig
  }

  start () {
    super.start()
    this.watchChat()
  }

  answer(roomId, msg) {
    this.matrix
      .sendTextMessage( roomId, msg )
      // .finally(function () {
      //   })
  }

  watchChat () {
    this.matrix.on('Room.timeline', (event, room, toStartOfTimeline) => {
      if (event.getType() !== 'm.room.message') {
        return
      }

      function isPrivate (sender, room) {
        return (sender === `@${room.name}:matrix.org`)
      }

      const isOperator = (sender) => sender === this.config.matrix.master

      if (isPrivate(event.getSender(), room) && isOperator(event.getSender())) {
        // console.log('Private OP message received')
        // console.log('event', event)
        // console.log('room', room)

        const msg = event.getContent().body

        let capture = msg.match(/^!(?<cmd>\w+)/) || []
        if (capture.length > 0 && capture.groups.cmd) {
          const cmd = capture.groups.cmd
          switch (cmd) {
            case 'status':
              this.answer(room.roomId, 'I am still there!')
              break
            default:
              this.answer(room.roomId, `Command *${cmd}* is not supported`)
          }
        }
      }
    })
  }
}
