import BN from 'bn.js';
import { PolkabotWorker } from '@polkabot/api/src/PolkabotWorker';
import { PluginModule, PluginContext, Room, CommandHandlerOutput, ErrorCode } from '@polkabot/api/src/types';
import { Command, Callable } from '@polkabot/api/src/decorators';
import { PolkabotPluginBase } from '@polkabot/api/src';
import { HeaderExtended } from '@polkadot/api-derive/type';

export type StallWatcherConfig = {
  duration: number;
  channels: string[];
}

export enum ConfigKeys {
  DURATION = 'DURATION',
  CHANNELS = 'CHANNELS',
}

/**
 * Stallwatcher is listening at blocks. If the next block takes longer
 * than [[DURATION]], an alert is raised.
 */
@Callable({ alias: 'sw' })
export default class StallWatcher extends PolkabotWorker {
  private static readonly MODULE = 'STALLWATCHER';

  private config: StallWatcherConfig;
  private stalled: boolean;
  private lastBlockTime: Date;
  private lastBlockNumber: BN;
  private watchdogId: NodeJS.Timeout;

  public constructor(mod: PluginModule, context: PluginContext, config?) {
    super(mod, context, config);

    // Calling this method in the ctor is mandatory
    PolkabotPluginBase.bindCommands(this);

    this.config = {
      duration: this.context.config.Get(StallWatcher.MODULE, ConfigKeys.DURATION),
      channels: this.context.config.Get(StallWatcher.MODULE, ConfigKeys.CHANNELS),
    };

    this.stalled = null;
  }

  /**
   * This command shows the status of the plugin.
   * @param _event 
   * @param room 
   */
  @Command({ description: 'Show status of the plugin' })
  public cmdStatus(_event, room: Room): CommandHandlerOutput {
    return {
      code: ErrorCode.Ok,
      logMsg: `Config: ${JSON.stringify(this.config)}, started: ${this.started}`,
      answers: [{
        room,
        message: `<ul><li>Last block: ${this.lastBlockNumber.toString(10)}</li><li>DURATION: ${this.config.duration}</li><li>started: ${this.started}</li><ul>`
      }]
    };
  }

  @Command({ description: 'Start the plugin' })
  public cmdStart(_event, room: Room): CommandHandlerOutput {
    this.start();
    return PolkabotPluginBase.generateSingleAnswer('OK Started', room);
  }

  @Command({ description: 'Stop the plugin' })
  public cmdStop(_event, room: Room): CommandHandlerOutput {
    this.stop();
    return PolkabotPluginBase.generateSingleAnswer('OK Stopped', room);
  }

  public start(): void {
    super.start();

    this.context.logger.info('StallWatcher - Starting with config:', this.config);
    this.watchChain().catch(error => {
      console.error('StallWatcher - Error subscribing to chain head: ', error);
    });
  }

  async watchChain(): Promise<void> {
    this.unsubs['subscribeNewHeads'] = await this.context.polkadot.rpc.chain.subscribeNewHeads((header: HeaderExtended) => {
      clearTimeout(this.watchdogId);

      this.watchdogId = setTimeout(this.alert.bind(this), this.config.duration * 1000);
      this.lastBlockNumber = header.number.unwrap().toBn();

      if (this.stalled) {

        this.context.polkabot.notify(
          {
            message: `Network no longer stalled, new block #${this.lastBlockNumber.toString(10)} was seen after ${this.getDuration().toFixed(2)}s. Either the node stalled, or the connection to it was interrupted.`
          },
          { notifiers: this.config.channels }
        );

        this.stalled = false;
      }

      // TODO: we should get the block time as stored in the block and not the time when WE SEE a new block
      this.lastBlockTime = new Date();
    });
  }

  private getDuration(): number {
    return (new Date().getTime() - this.lastBlockTime.getTime()) / 1000;
  }

  private alert(): void {
    this.stalled = true;
    this.context.polkabot.notify(
      {
        message: `CRITICAL: Network seems to be stalled !!! Block #${this.lastBlockNumber.toString(10)} was seen ${this.config.duration}s ago.`
      },
      { notifiers: this.config.channels }
    );
  }
}
