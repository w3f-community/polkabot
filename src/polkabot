#!/usr/bin/env node
import Polkabot from './index.js'

const argv = require('yargs')
  .usage('Usage: $0 <command> [options]')
  .alias('c', 'config')
  .nargs('c', 1)
  .describe('c', 'Select config file')
  .demandOption(['c'])
  .help('h')
  .alias('h', 'help')
  .epilog('chevdor-(C)2018')
  .argv

var polkabot = new Polkabot(argv)

polkabot.run()
