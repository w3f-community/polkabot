import Plugin from '../../lib/lib';
import pluginConfig from './config';

module.exports = class SuperPlugin extends Plugin {
  constructor (...args) {
    super(args);
    this.config[this.name] = pluginConfig;
  }

  start () {
    super.start();

    // Interact with Polkadot
    this.polkadot.chain
      .newHead((error, header) => {
        if (error) console.error(error);
        // ...
      })
      .catch(e => console.log);

    // Interact with Matrix.org
    this.matrix.on('Room.timeline', (event, room, toStartOfTimeline) => {
      // ...
    });
  }
};
