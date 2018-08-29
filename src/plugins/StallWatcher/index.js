#!/usr/bin/env node
import Plugin from '../../lib/lib'
import pluginConfig from './config'
import BN from 'bn.js'

module.exports = class StallWatcher extends Plugin {
  constructor (...args) {
    super(args)
    this.version = '0.0.1'

    this.config[this.name] = pluginConfig
  }

  start () {
    super.start()
    this.watchChain()
  }

  watchChain () {
    this.polkadot.chain
      .newHead((error, header) => {
        if (error) console.error('ERR:', error)
        clearTimeout(this.watchdogId)

        this.watchdogId = setTimeout(this.alert.bind(this), pluginConfig.duration * 1000)
        this.lastBlockNumber = new BN(header.number, 16)
        this.lastBlockTime = new Date()
      })
      .catch(e => console.log)
  }

  getDuration () {
    return (new Date() - this.lastBlockTime) / 1000
  }

  alert () {
    this.matrix.sendTextMessage(
      this.config.matrix.room,
      `CRITICAL: Network seems to be stalled !!! The last block (#${this.lastBlockNumber.toString(10)}) was see ${pluginConfig.duration}s ago.`)
    .finally(function () {
    })
  }
}
