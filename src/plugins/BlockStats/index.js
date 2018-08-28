#!/usr/bin/env node
import Plugin from '../../lib/lib'
import BN from 'bn.js'

export default class Blocthday extends Plugin {
  constructor (matrix, polkadot) {
    super(matrix, polkadot)
    this.name = 'BlockStats'
    this.version = '0.0.1'

    // Every how many blocks do we output stats
    this.NB_BLOCKS = 10

    this.watchChain()
    this.data = []

    console.log(' * Plugin: BlockStats started')
  }

  watchChain () {
    this.polkadot.chain
      .newHead((error, header) => {
        if (error) console.error('ERR:', error)
        const bnBlockNumber = new BN(header.number, 16)

        // console.log('#' + bnBlockNumber.toString(10))

        this.addBlock(header)

        if (bnBlockNumber.mod(new BN(this.NB_BLOCKS)).toString(10) === '0') {
          this.computeStats()
          this.showStats(bnBlockNumber)
        }
      })
      .catch(e => console.log)
  }

  addBlock (header) {
    this.data.push({
      tmsp: new Date(),
      header
    })

    while (this.data.length > this.NB_BLOCKS) { this.data.shift() }
  }

  computeStats () {
    this.stats = {
      nbBlock: this.data.length,
      averageBlockTime: 42
    }
  }

  showStats (bnBlockNumber) {
    this.matrix.sendTextMessage(
        '!dCkmWIgUWtONXbANNc:matrix.org',
        `Stats at #${bnBlockNumber.toString(10)}
    Nb Blocks: ${this.stats.nbBlock}
    Average Block time: ${this.stats.averageBlockTime}`)
      .finally(function () {
      })
  }
}
