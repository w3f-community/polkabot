#!/usr/bin/env node
import Plugin from '../../lib/lib'
import BN from 'bn.js'

module.exports = class Blocthday extends Plugin {
  constructor (matrix, polkadot) {
    super(matrix, polkadot)
    this.name = 'BlockStats'
    this.version = '0.0.1'

    this.config = {
      NB_BLOCKS: 300,     // Every how many blocks do we output stats
      threshold: 6.0      //
    }

    this.watchChain()
    this.data = []
    this.previousData = null
  }

  watchChain () {
    this.polkadot.chain
      .newHead((error, header) => {
        if (error) console.error('ERR:', error)
        const bnBlockNumber = new BN(header.number, 16)

        this.addBlock(header)

        if (bnBlockNumber.mod(new BN(this.config.NB_BLOCKS)).toString(10) === '0') {
          this.computeStats()
          this.alert(bnBlockNumber)
        }
      })
      .catch(e => console.log)
  }

  addBlock (header) {
    const data = {
      tmsp: new Date(),
      blockTime: this.previousData ? new Date() - this.previousData.tmsp : null
      // header
    }
    this.data.push(data)

    while (this.data.length > this.config.NB_BLOCKS) { this.data.shift() }
    this.previousData = data
  }

  averageBlockTime () {
    const sum = (accumulator, currentValue) => accumulator + currentValue
    return this.data
      .map(el => el.blockTime || 0)
      .reduce(sum) / this.data.filter(item => item.blockTime > 0).length / 1000
  }

  computeStats () {
    this.stats = {
      nbBlock: this.data.length,
      averageBlockTime: this.averageBlockTime()
    }
  }

  alert (bnBlockNumber) {
    if (this.stats.averageBlockTime >= this.config.threshold) {
      this.matrix.sendTextMessage(
          '!dCkmWIgUWtONXbANNc:matrix.org',
          `Stats for the last ${this.config.NB_BLOCKS} at #${bnBlockNumber.toString(10)}:
      Nb Blocks: ${this.stats.nbBlock}
      Average Block time: ${this.stats.averageBlockTime.toFixed(3)}s`)
        .finally(function () {
        })
    }
  }
}
