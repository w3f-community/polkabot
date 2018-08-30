#!/usr/bin/env node
import Plugin from '../../lib/lib'
import BN from 'bn.js'
import pluginConfig from './config'

module.exports = class Blocthday extends Plugin {
  constructor (...args) {
    super(args)
    this.version = '0.0.1'

    // Every how many blocks do we wish a happy Blocthday
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

        const bnBlockNumber = new BN(header.number, 16)

        // console.log('#' + bnBlockNumber.toString(10))

        if (bnBlockNumber.mod(new BN(pluginConfig.NB_BLOCKS)).toString(10) === '0') {
          this.matrix.sendTextMessage(
            this.config.matrix.room,
            `Happy ${pluginConfig.NB_BLOCKS}-BlocthDay!!! Polkadot is now at #${bnBlockNumber.toString(10)}`)
            .finally(function () {
            })
        }
      })
      .catch(e => console.log)
  }
}
