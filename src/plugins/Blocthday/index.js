#!/usr/bin/env node
import Plugin from '../../lib/lib'
import BN from 'bn.js'

export default class Blocthday extends Plugin {
  constructor (matrix, polkadot) {
    super(matrix, polkadot)
    this.name = 'Blocthday'
    this.version = '0.0.1'

    // Every how many blocks do we wish a happy Blocthday
    const NB_BLOCKS = 1000

    polkadot.chain
      .newHead((error, header) => {
        if (error) console.error('ERR:', error)

        const bnBlockNumber = new BN(header.number, 16)

        console.log('#' + bnBlockNumber.toString(10))

        if (bnBlockNumber.mod(new BN(NB_BLOCKS)).toString(10) === '0') {
          matrix.sendTextMessage(
            '!dCkmWIgUWtONXbANNc:matrix.org',
            `Happy BlocthDay!!! Polkadot is now at #${bnBlockNumber.toString(10)}`)
          .finally(function () {
          })
        }
      })
      .catch(e => console.log)
  }
}
