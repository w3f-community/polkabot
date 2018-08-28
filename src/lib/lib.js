#!/usr/bin/env node

export default class Plugin {
  constructor (args) {
    // console.log('Plugin args', args)
    this.name = args[0]
    this.config = args[1]
    this.matrix = args[2]
    this.polkadot = args[3]

    // console.log('Name set to ', this.name)
    // console.log('Config set to ', this.config)
    // console.log('Matrix set to ', this.matrix)
    // console.log('Polkadot set to ', this.polkadot)
  }

  start () {
    console.log('   starting ' + this.name)
  }
}
