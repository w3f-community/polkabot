module.exports = {

  // General Polkadot config
  polkadot: {
    // This is just for you to remember
    node_name: 'Crash Override',
    // WebSocket host:port, usually :9944
    host: 'ws://127.0.0.1:9944'
  },

  // General Matrix config

  matrix: {
    // Who is managing the bot
    master: '@you:matrix.org',
    // In what room is the bot active by default
    room: '!<someid>:matrix.org',
    // Credentials of the bot
    userId: '@...:matrix.org',
    token: 'your_token_here'
  }
}
