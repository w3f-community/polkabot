import BN from 'bn.js';
import { PolkabotWorker } from '@polkabot/api/src/PolkabotWorker';
import { HeaderExtended } from '@polkadot/api-derive/type';
import { Command, Callable } from '@polkabot/api/src/decorators';
import { PluginModule, PluginContext, Room, CommandHandlerOutput, NotifierMessage, NotifierSpecs } from '@polkabot/api/src/types';

// @Configured({['NB_BLOCKS'}])
@Callable({ alias: 'bday' })
export default class Blocthday extends PolkabotWorker {
  private NB_BLOCKS: number;

  public constructor(mod: PluginModule, context: PluginContext, config?) {
    super(mod, context, config);
    this.context.logger.silly('++ Blocthday');

    // TODO: would be great to use a decorator for that
    this.NB_BLOCKS = this.context.config.Get('BLOCTHDAY', 'NB_BLOCKS');
  }

  @Command({ description: 'Show status of the plugin' })
  public cmdStatus(_event, room: Room): CommandHandlerOutput {
    this.context.logger.debug('Blocthday.cmdStatus()');

    return {
      code: -1,
      msg: 'Implement me first!',
      answers: [{
        room,
        message: 'Oups! This is BlockDay, this command is not implmented yet 🥴'
      }]
    };
  }

  public start(): void {
    this.context.logger.info('Starting with NB_BLOCKS: %d', this.NB_BLOCKS);

    this.watchChain().catch(error => {
      this.context.logger.error('Error subscribing to chain head: ', error);
    });
  }

  /**
   * Start watching the chain.
   * See https://polkadot.js.org/api/examples/promise/02_listen_to_blocks/
   */
  async watchChain(): Promise<void> {
    this.unsubs['subscribeNewHeads'] = await this.context.polkadot.rpc.chain.subscribeNewHeads((header: HeaderExtended) => {
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
