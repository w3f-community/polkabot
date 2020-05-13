import BN from 'bn.js';
import {
  NotifierMessage,
  NotifierSpecs,
  PluginModule,
  PluginContext,
  CommandHandlerOutput,
  Controllable,
  PluginCommandSet,
  Room
} from '@polkabot/api/src/plugin.interface';
import { PolkabotWorker } from '@polkabot/api/src/PolkabotWorker';
import { HeaderExtended } from '@polkadot/api-derive/type';

import getCommandSet from './commandSet';

export default class Blocthday extends PolkabotWorker implements Controllable {
  private NB_BLOCKS: number;
  public commandSet: PluginCommandSet;
  public unsub: Function;

  public cmdStatus(_event, room: Room): CommandHandlerOutput {
    this.context.logger.debug('Blocthday.cmdStatus()');
    // this.context.logger.info("Called cmdStatus with:", args);

    return {
      code: -1,
      msg: 'Implement me first!',
      answers: [{
        room,
        message: 'Oups! This is BlockDay, this command is not implmented yet 🥴'
      }]
    };
  }

  public constructor(mod: PluginModule, context: PluginContext, config?) {
    super(mod, context, config);
    this.NB_BLOCKS = parseInt(process.env.POLKABOT_BLOCTHDAY_NB_BLOCKS) || 1000000;
    this.commandSet = getCommandSet(this);
  }

  public start(): void {
    this.context.logger.info('Blocthday - Starting with NB_BLOCKS:', this.NB_BLOCKS);
    this.watchChain().catch(error => {
      console.error('Blocthday - Error subscribing to chain head: ', error);
    });
  }

  public stop(): void {
    this.context.logger.debug('Blocthday - STOPPING');

    if (this.unsub)
      this.unsub();
  }

  /**
   * Start watching the chain.
   * See https://polkadot.js.org/api/examples/promise/02_listen_to_blocks/
   */
  async watchChain(): Promise<void> {
    this.unsub = await this.context.polkadot.rpc.chain.subscribeNewHeads((header: HeaderExtended) => {
      const bnBlockNumber: BN = header.number.unwrap().toBn();
      const bnNumberOfBlocks: BN = new BN(this.NB_BLOCKS);

      if (bnBlockNumber.mod(bnNumberOfBlocks).toString(10) === '0') {
        const notifierMessage: NotifierMessage = {
          message: `Happy ${this.NB_BLOCKS}-BlocthDay!!! Chain is now at #${header.number}`
        };

        const notifierSpecs: NotifierSpecs = {
          notifiers: ['matrix', 'twitter']
        };

        this.context.polkabot.notify(notifierMessage, notifierSpecs);
      }
    });
  }
}
