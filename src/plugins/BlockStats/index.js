#!/usr/bin/env node
import Plugin from '../../lib/lib'
import BN from 'bn.js'
import pluginConfig from './config'

module.exports = class Blocthday extends Plugin {
  constructor (...args) {
    super(args)
    this.version = '0.0.1'

    this.config[this.name] = pluginConfig

    this.data = []
    this.previousData = null
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

        this.addBlock(header)

        if (bnBlockNumber.mod(new BN(this.config[this.name].NB_BLOCKS)).toString(10) === '0') {
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

    while (this.data.length > this.config[this.name].NB_BLOCKS) { this.data.shift() }
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
    if (this.stats.averageBlockTime >= pluginConfig.threshold) {
      this.matrix.sendTextMessage(
          this.config.matrix.room,
          `WARNING: Average block time exceeded ${pluginConfig.threshold.toFixed(3)}s
Stats for the last ${pluginConfig.NB_BLOCKS} at #${bnBlockNumber.toString(10)}:
    - Nb Blocks: ${this.stats.nbBlock}
    - Average Block time: ${this.stats.averageBlockTime.toFixed(3)}s`)
        .finally(function () {
        })
    }
  }
}
