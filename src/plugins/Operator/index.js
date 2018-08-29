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

  watchChat () {
    this.matrix.on('Room.timeline', function (event, room, toStartOfTimeline) {
      if (event.getType() !== 'm.room.message') {
        return
      }

      function isPrivate (sender, room) {
        return (sender === `@${room.name}:matrix.org`)
      }

      const isOperator = (sender) => sender === this.config.matrix.master

      if (isPrivate(event.getSender(), room) && isOperator(event.getSender())) {
        const msg = event.getContent().body

        this.matrix.sendTextMessage(
          this.config.matrix.room,
          'OP: your command is ' + msg).finally(function () {
          })
      }
    })
  }
}
