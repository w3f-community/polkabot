#!/usr/bin/env node
import Plugin from '../../lib/lib'
import pluginConfig from './config'
import BN from 'bn.js'

module.exports = class StallWatcher extends Plugin {
  constructor (...args) {
    super(args)
    this.version = '0.0.1'

    this.config[this.name] = pluginConfig

    this.previousValidators = []
    this.currentValidators = []
  }

  start () {
    super.start()
    this.watchChain()
  }

  getValidators () {
    if (this.previousValidators.length) { return ['5Dpq7rU6KAZVdRtcegvpCoeJtZzFPzieRkRz4xajRAiMRkCf'] }
    return ['5F2ABwFm3fUhWMZT7Zeu7UjCr1dndjJD7qBeHChJhiJC949V', '5Dpq7rU6KAZVdRtcegvpCoeJtZzFPzieRkRz4xajRAiMRkCf']
  }

  validatorChanged () {
    return !(JSON.stringify(this.previousValidators) === JSON.stringify(this.currentValidators))
  }

  watchChain () {
    this.polkadot.chain
      .newHead((error, header) => {
        if (error) console.error('ERR:', error)

        this.bnBlockNumber = new BN(header.number, 16)

        this.previousValidators = this.currentValidators
        this.currentValidators = this.getValidators()

        if (this.previousValidators.length &&
          this.validatorChanged()) {
          this.alert()
        }
      })
      .catch(e => console.log)
  }

  formatValidators (array) {
    let res = ''
    array.map(item => {
      res += `\t - ${item}\n`
    })
    return res
  }

  // TODO: Don´t show before after but who is IN and OUT
  alert () {
    this.matrix.sendTextMessage(
      this.config.matrix.room,
      `#${this.bnBlockNumber.toString(10)} - Validators have changed:
    Previous:
${this.formatValidators(this.previousValidators)}
    Current:
${this.formatValidators(this.currentValidators)}
See details at http://polkadash.io/`)
      .finally(function () {
      })
  }
}
