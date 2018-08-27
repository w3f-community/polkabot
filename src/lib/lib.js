#!/usr/bin/env node

class User {
  constructor (name) {
    this.name = name
  }

  hello () {
    return 'Hello ' + this.name
  }
}

module.exports = {
  User
}
