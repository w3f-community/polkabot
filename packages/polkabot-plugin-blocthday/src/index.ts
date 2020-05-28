import BN from 'bn.js';
import { PolkabotWorker } from '@polkabot/api/src/PolkabotWorker';
import { HeaderExtended } from '@polkadot/api-derive/type';
import { Command, Callable, Trace } from '@polkabot/api/src/decorators';
import { PluginModule, PluginContext, Room, CommandHandlerOutput, NotifierMessage, NotifierSpecs, ErrorCode, Controllable } from '@polkabot/api/src/types';
import { PolkabotPluginBase, assert, LoggerFactory } from '@polkabot/api/src';
import { Checkers } from './checkers';

/**
 * This is a trick: we cannot declare Blocthday as implementing
 * the Controllable interface as it 'apparently' does not.
 * It actually does thanks to decorators but this is dynamic
 * and typescript cannot know about it. This also allows not having to
 * cast 'as unknown as Controllable' all over the place for instances.
 */
// interface Blocthday extends Controllable { }  // TODO: bring back

/**
 * This is a convenience to describe the config expected by the plugin.
 * Most of the fields should be available in the config (See confmgr).
 */
export type BlocthdayConfig = {
  /** The list of channels we notify */
  channels: string[];
  /** A list of 'special' blocks we may want to announce. */
  specials: BN[];
  /** Every nth block to announce. 0= disabled. 1=every block.*/
  nbBlocks: number;
}

/**
 * This plugin wishes announces when the chain reached a set of given block numbers.
 * The initial version was taking a NB_BLOCKS parameters. It ended up annoying: at first, when the chain is at block < 1000,
 * you may want to wish every 1000th block. After a while however, this is very boring. It has been kept for debuggin purposes 
 * but NB_BLOCKS should be left to its default (0) in production.
 * The current version is adapting and supporting special arbitrary anniversaries.
 */
@Callable({ alias: 'bday' })
export default class Blocthday extends PolkabotWorker {
  private config: BlocthdayConfig;
  private currentBlock: BN;

  public constructor(mod: PluginModule, context: PluginContext, config?) {
    super(mod, context, config);
    this.context.logger.silly('++ Blocthday');

    // The following asserts are only valid if you want this plugin to be Controllable
    const commands = (Blocthday as unknown as Controllable).commands;
    assert(typeof commands !== 'undefined', 'Commands were not set');
    assert(Object.keys(commands).length > 0, 'commands contains no command!');

    // Calling this method in the ctor is mandatory
    PolkabotPluginBase.bindCommands(this);

    // We initialize the config. Here we usually call confmgr
    // TODO: Call confmgr
    this.config = {
      channels: ['matrix', 'twitter'], // TODO: Load from config
      nbBlocks: this.getConfig('NB_BLOCKS'),
      specials: [], // TODO: Load from config
    }
  }

  /**
   * This command shows the status of the plugin.
   * @param _event 
   * @param room 
   */
  @Command({ description: 'Show status of the plugin' })
  @Trace()
  public cmdStatus(_event, room: Room): CommandHandlerOutput {
    return {
      code: ErrorCode.Ok,
      logMsg: `Config: ${JSON.stringify(this.config)}, started: ${this.started}`,
      answers: [{
        room,
        message: `<ul><li>Current block: ${this.currentBlock.toString(10)}</li><li>NB_BLOCKS: ${this.config.nbBlocks}</li><li>started: ${this.started}</li><ul>`
      }]
    };
  }

  // @Trace()
  // @Command({ description: 'Get the current list of the special blocks' })
  // public cmdGetSpecials(_event, room: Room): CommandHandlerOutput {
  //   return {
  //     code: ErrorCode.Ok,
  //     logMsg: `Specials: ${JSON.stringify(this.config.specials)}`,
  //     answers: [{
  //       room,
  //       message: `Specials: ${JSON.stringify(this.config.specials)}`
  //     }]
  //   };
  // }

  /**
   * This command mainly demonstrates how to change some varialbles of the plugin at runtime
   * @param _event 
   * @param room 
   * @param args 
   */
  @Trace()
  @Command({ description: 'Add/remove specials' }) // TODO: Add regexp here to keep simple
  public cmdSpecials(_event, room: Room, args: string[]): CommandHandlerOutput {
    this.context.logger.debug('args: %o', args)

    const subCommand = args && args.length == 2 ? args[0] : 'get'
    const commandArgs = args && args.length == 2 ? args[1] : null // TODO: should not take [1] but 'all the rest

    this.context.logger.debug('subCommand: %s', subCommand)
    this.context.logger.debug('commandArgs: %s', commandArgs)

    // TODO: Ideally, specials should be handled as a set
    const blockArg = new BN(commandArgs);
    switch (subCommand) {
      case 'get':
        break
      case 'add':
        if (blockArg.lte(this.currentBlock))
          return { code: ErrorCode.GenericError, logMsg: `It makes no sense to add a block that past` }
        else
          this.config.specials.push(blockArg)
        break
      case 'rm':

        const index = this.config.specials.indexOf(blockArg, 0);
        if (index > -1) {
          this.config.specials.splice(index, 1);
        }
        break
      default:
        return {
          code: ErrorCode.GenericError,
          logMsg: `Blocthday subcommand ${subCommand} for command specials not found`,
          answers: [{
            room,
            message: `Blocthday subcommand ${subCommand} for command specials not found`
          }]
        };
    }

    const specialsAsString = this.config.specials.map(bn => bn.toString(10))
    return {
      code: ErrorCode.Ok,
      logMsg: `Specials: ${specialsAsString}`,
      answers: [{
        room,
        message: `Specials: ${specialsAsString}`
      }]
    };
  }

  @Trace()
  @Command({ description: 'Start the plugin' })
  public cmdStart() {

  }

  @Command({ description: 'Stop the plugin' })
  @Trace()
  public cmdStop() {

  }

  public start(): void {
    super.start();
    this.context.logger.info('Starting Blocthday with config set to %o', this.config);

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
      this.currentBlock = header.number.unwrap().toBn();

      if (Checkers.check(this.currentBlock, this.config.nbBlocks) ||
        Checkers.checkerSpecials(this.currentBlock, this.config.specials)) {
        // TODO: If you hit one of the specials, we could not remove it from the list

        const notifierMessage: NotifierMessage = {
          message: `Happy ${this.config.nbBlocks}-BlocthDay!!! The chain is now at block #${this.currentBlock.toString(10)}`
        };

        this.context.polkabot.notify(notifierMessage, { notifiers: this.config.channels });
      }
    });
  }
}

// Related to the Blocthday interface, see above.
// export default Blocthday;
