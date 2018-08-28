const config = {
  polkadot: {
    host: 'ws://127.0.0.1:9944'
  },
  matrix: {
    master: '@you:matrix.org'
  },

  userId: '@...:matrix.org',
  token: 'your_token_here',

  // Plugin names must match folder names in the plugins folder
  plugins: [{
    name: 'BlockStats',
    enabled: true
  }, {
    name: 'Blocthday',
    enabled: true
  }, {
    name: 'Operator',
    enabled: true
  }]
}

export default config
