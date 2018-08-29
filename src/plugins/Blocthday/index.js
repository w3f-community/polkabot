#!/usr/bin/env node
import Plugin from '../../lib/lib'
import BN from 'bn.js'

module.exports = class Blocthday extends Plugin {
  constructor (...args) {
    super(args)
    this.version = '0.0.1'

    // Every how many blocks do we wish a happy Blocthday
    const NB_BLOCKS = 1000

    this.polkadot.chain
      .newHead((error, header) => {
        if (error) console.error('ERR:', error)

        const bnBlockNumber = new BN(header.number, 16)

        // console.log('#' + bnBlockNumber.toString(10))

        if (bnBlockNumber.mod(new BN(NB_BLOCKS)).toString(10) === '0') {
          this.matrix.sendTextMessage(
            this.config.matrix.room,
            `Happy BlocthDay!!! Polkadot is now at #${bnBlockNumber.toString(10)}`)
          .finally(function () {
          })
        }
      })
      .catch(e => console.log)
  }
}
