import BN from 'bn.js';
import { PolkabotWorker } from '@polkabot/api/src/PolkabotWorker';
import { HeaderExtended } from '@polkadot/api-derive/type';
import { Command, Callable } from '@polkabot/api/src/decorators';
import { Controllable, PluginModule, PluginContext, Room, CommandHandlerOutput, NotifierMessage, NotifierSpecs } from '@polkabot/api/src/types';
import { assert } from '@polkabot/api/src/utils';

// @Configured({['NB_BLOCKS'}])
@Callable({ name: 'Blocthday', alias: 'bday' })
export default class Blocthday extends PolkabotWorker {
  private NB_BLOCKS: number;
  // public commandSet: PluginCommandSet;

  // TODO: it would be nice if the decorator could declare that
  // static meta: CallableMetas;
  // static commands: PluginCommand[] = [];

  private unsub: Function;

  public constructor(mod: PluginModule, context: PluginContext, config?) {
    super(mod, context, config);
    this.context.logger.silly('++ Blocthday');

    // TODO: would be great to use a decorator for that
    this.NB_BLOCKS = this.context.config.Get('BLOCTHDAY', 'NB_BLOCKS');
    // Blocthday.commandSet = {} // getCommandSet(this);
    // this.context.logger.debug('commands: %s', JSON.stringify(this.getCommands(), null, 0));
  }
  
  // getCommandSet(): PluginCommandSet {
  //   const res: PluginCommandSet = { ...Blocthday.meta, commands: Blocthday.commands}; 
  //   return res;
  // }

  @Command({ name: 'status', description: 'Show status of the plugin', argsRegexp: '', adminOnly: false })
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

  @Command()
  public cmdTest(_event, room: Room): CommandHandlerOutput {
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
    assert((Blocthday as unknown as Controllable).commands.length > 0, 'Missing commands');
   
    this.watchChain().catch(error => {
      this.context.logger.error('Error subscribing to chain head: ', error);
    });
  }

  public stop(): void {
    this.context.logger.debug('STOPPING');

    // TODO: we can make it generic if unsub is a dictionnary of unsub handlers. We could then automatically go thru them and unsub in the base class
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
