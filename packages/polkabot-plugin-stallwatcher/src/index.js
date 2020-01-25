#!/usr/bin/env node
import BN from 'bn.js'
import pluginConfig from './config'

module.exports = class StallWatcher {
  constructor (pbot) {
    this.pbot = pbot
    this.config = pluginConfig
    this.stalled = null
  }

  start () {
    // this.showInstructions()
    console.log('StallWatcher - Starting with config:', this.config)
    this.watchChain().catch((error) => {
      console.error('StallWatcher - Error subscribing to chain head: ', error)
    })
    this.watchChat()
  }

  showInstructions () {
    // Send message to the room notifying users how to use the bot
    const messageBody = 'Polkabot StallWatcher Plugin private (Bot Master Only) user usage instructions:\n  1) Ask Polkabot StallWatcher to change how frequently in blocks it should expect to receive new blocks prior to publishing an alert with command: !sw duration <MAX_DURATION_IN_SECONDS>'
    this.announce(messageBody)
  }

  announce (msg) {
    console.log('StallWatcher - Announcing: ', msg)
    this.pbot.matrix.sendTextMessage(this.pbot.config.matrix.roomId, msg)
  }

  async watchChain () {
    // Reference: https://polkadot.js.org/api/examples/promise/02_listen_to_blocks/
    await this.pbot.polkadot.rpc.chain
      .subscribeNewHead((header) => {
        // FIXME - is this issue still an issue. see https://github.com/polkadot-js/api/issues/142
        if (header) {
          clearTimeout(this.watchdogId)
          // console.log('StallWatcher: ' + this.getDuration().toFixed(2) + 's')
          this.watchdogId = setTimeout(this.alert.bind(this), this.config.duration * 1000)
          this.lastBlockNumber = new BN(header.blockNumber, 16)
          if (this.stalled) {
            this.announce(`Network no longer stalled, new block #${this.lastBlockNumber.toString(10)} came in after ${this.getDuration().toFixed(2)}s`)
            this.stalled = false
          }
          this.lastBlockTime = new Date()
        }
      })
  }

  getDuration () {
    return (new Date() - this.lastBlockTime) / 1000
  }

  alert () {
    this.stalled = true
    this.announce(`CRITICAL: Network seems to be stalled !!! The last block #${this.lastBlockNumber.toString(10)} was seen ${this.config.duration}s ago.`)
  }

  answer (roomId, msg) {
    this.pbot.matrix.sendTextMessage(roomId, msg)
  }

  watchChat () {
    this.pbot.matrix.on('Room.timeline', (event, room, toStartOfTimeline) => {
      if (event.getType() !== 'm.room.message') {
        return
      }

      // TODO - refactor into a common utility plugin or similar since this code
      // is duplicate of that in polkadot-plugin-operator.
      const directChatRoomMemberIds = Object.keys(room.currentState.members)

      const expectedDirectMessageRoomMemberIds = [
        this.pbot.config.matrix.botMasterId,
        this.pbot.config.matrix.botUserId
      ]

      // Has the Bot Master initiated a direct chat with the Bot
      const isBotMasterAndBotInRoom = expectedDirectMessageRoomMemberIds
        .every(val => directChatRoomMemberIds.includes(val))
      // console.log('StallWatcher - isBotMasterAndBotInRoom: ', isBotMasterAndBotInRoom)

      // Is the chat room name the same name as the Bot's name
      // After string manipulation to get just the username from the Bot's
      // user id (i.e. @mybot:matrix.org ---> mybot)
      const isBotMessageRecipient =
        room.name === this.pbot.config.matrix.botUserId
          .split(':')
          .shift()
          .substring(1)
      // console.log('StallWatcher - isBotMessageRecipient: ', isBotMessageRecipient)

      /**
       * Check that the room id where the sender of the message
       * sent the message from is the same as the room id where
       * that the bot is in.
       */
      function isPrivate (senderRoomId, roomIdWithBot) {
        return (senderRoomId === roomIdWithBot)
      }

      /**
       * Check if the sender id of the user that sent the message
       * is the Bot Master's id
       */
      const isOperator = (senderId) => {
        const isSenderOperator = senderId === this.pbot.config.matrix.botMasterId
        // console.log('StallWatcher - isSenderOperator: ', isSenderOperator)
        return isSenderOperator
      }

      const msg = event.getContent().body

      // FIXME - this still triggers an error in the logs when the Bot Master
      // sends a message without an argument in the public room (i.e. `!say`)
      if (!msg) {
        return
      }

      const senderId = event.getSender()
      const senderRoomId = event.sender.roomId
      const roomIdWithBot = room.roomId

      // console.log('StallWatcher - msg: ', msg)
      // console.log('StallWatcher - senderId: ', senderId)
      // console.log('StallWatcher - senderRoomId', senderRoomId)
      // console.log('StallWatcher - roomIdWithBot', roomIdWithBot)

      if (isPrivate(senderRoomId, roomIdWithBot)) {
        if (
          isOperator(senderId) &&
          isBotMasterAndBotInRoom &&
          isBotMessageRecipient
        ) {
          // console.log('StallWatcher - Bot received message from Bot Master in direct message')
          /**
           * Detect if the command received from the Bot Master is in
           * the following form: `!sw duration <DURATION_IN_SECONDS>`
           */
          let capture = msg.match(/^!((?<mod>\w+)\s+)?(?<cmd>\w+)(\s+(?<args>.*?))??$/i) || []
          // console.log('StallWatcher - captured from Bot Master: ', capture)
          if (capture.length > 0 && capture.groups.cmd) {
            const mod = capture.groups.mod
            const cmd = capture.groups.cmd
            const args = capture.groups.args

            if (mod !== 'sw') return

            console.log('StallWatcher - mod: ', mod)
            console.log('StallWatcher - cmd: ', cmd)
            console.log('StallWatcher - args: ', args)
            switch (cmd) {
              case 'duration':
                const val = parseFloat(args)
                if (!isNaN(val)) { this.config.duration = val }
                this.answer(room.roomId,
                  `Threshold changed to ${this.config.duration}s`)
                break
              default:
                this.answer(room.roomId, `StallWatcher - Command *!${cmd}* is not supported. You can use commands:
!sw duration 6.8`)
            }
          }
        }
      }
    })
  }
}
