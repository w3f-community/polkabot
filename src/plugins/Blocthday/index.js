#!/usr/bin/env node
import Plugin from '../lib/lib'

export default class Blocthday extends Plugin {
  constructor (matrix) {
    super(matrix)
    this.name = 'Blocthday'
    this.version = '0.0.1'
  }
}
