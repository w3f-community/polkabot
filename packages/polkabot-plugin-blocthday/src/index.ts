import BN from 'bn.js';
import { PolkabotWorker } from '@polkabot/api/src/PolkabotWorker';
import { HeaderExtended } from '@polkadot/api-derive/type';
import { Command, Callable } from '@polkabot/api/src/decorators';
import { PluginModule, PluginContext, Room, CommandHandlerOutput, NotifierMessage, NotifierSpecs, ErrorCode, Controllable } from '@polkabot/api/src/types';
import { PolkabotPluginBase, assert } from '@polkabot/api/src';

/**
 * This is a trick: we cannot declare Blocthday as implementing
 * the Controllable interface as it 'apparently' does not.
 * It actually does thanks to decorators but this is dynamic
 * and typescript cannot know about it. This also allows not having to
 * cast 'as unknown as Controllable' all over the place.
 */
// interface Blocthday extends Controllable { }  // TODO: bring back

@Callable({ alias: 'bday' })
export default class Blocthday extends PolkabotWorker {
  private nbBlocks: number;

  public constructor(mod: PluginModule, context: PluginContext, config?) {
    super(mod, context, config);
    this.context.logger.silly('++ Blocthday');

    // The following asserts are only valid if you want this plugin to be Controllable
    const commands = (Blocthday as unknown as Controllable).commands;
    assert(typeof commands !== 'undefined', 'Commands were not set');
    assert(Object.values(commands).length > 0, 'commands contains no command!');
    //this.context.logger.silly('Blocthday: %o', Blocthday); // OK
    //this.context.logger.silly('commands: %o', commands); // OK

    PolkabotPluginBase.bindCommands(this);
    
    this.nbBlocks = this.getConfig('NB_BLOCKS');
    this.context.logger.silly('nbBlocks set to %d', this.nbBlocks);
  }

  @Command({ description: 'Show status of the plugin' })
  // public cmdStatus(that: Blocthday, _event, room: Room): CommandHandlerOutput {
  public status( _event, room: Room): CommandHandlerOutput {
    console.log('Running Blocthday.status()');
    console.log(this, this.context);

    this.context.logger.debug('Blocthday.cmdStatus()');

    return {
      code: ErrorCode.Ok,
      msg: `We wish blocthday every ${this.nbBlocks}`,
      answers: [{
        room,
        message: `We wish blocthday every ${this.nbBlocks}`
      }]
    };
  }

  public start(): void {
    this.context.logger.info('Starting with NB_BLOCKS: %d', this.nbBlocks);

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
      const bnNumberOfBlocks: BN = new BN(this.nbBlocks);

      if (bnBlockNumber.mod(bnNumberOfBlocks).toString(10) === '0') {
        const notifierMessage: NotifierMessage = {
          message: `Happy ${this.nbBlocks}-BlocthDay!!! Chain is now at #${header.number}`
        };

        const notifierSpecs: NotifierSpecs = {
          notifiers: ['matrix', 'twitter']
        };

        this.context.polkabot.notify(notifierMessage, notifierSpecs);
      }
    });
  }
}

// export default Blocthday; // TODO: bring back
