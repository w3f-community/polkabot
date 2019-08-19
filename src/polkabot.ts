#!/usr/bin/env node
import Polkabot from './index.js'

const argv = require('yargs')
  .usage('Usage: $0 <command> [options]')
  .help('h')
  .alias('h', 'help')
  .epilog('chevdor-(C) 2018-2019')
  .argv

const polkabot = new Polkabot(argv)

polkabot.run()
