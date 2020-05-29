import BN from 'bn.js';
import { PolkabotWorker } from '@polkabot/api/src/PolkabotWorker';
import { HeaderExtended } from '@polkadot/api-derive/type';
import { PluginModule, PluginContext, NotifierMessage, NotifierSpecs } from '@polkabot/api/src/types';
import { Command, Callable } from '@polkabot/api/src/decorators';
import { PolkabotPluginBase, Room, CommandHandlerOutput, ErrorCode } from '@polkabot/api/src';

/**
 * Blockstats internal data.
 */
export type Data = {
  tmsp: number;
  blockTime: number;
  header: HeaderExtended;
};

/**
 * This is the config structure for Blockstats.
 */
export type BlockStatsConfig = {
  logNthBlock: number;
  threshold: number;
  nbBlocks: number;
  channels: string[];
}

/**
 * Those are the config keys supported by Blockstats.
 */
export enum ConfigKeys {
  /** Size of the rolling buffer */
  NB_BLOCKS = 'NB_BLOCKS',
  /** We remain silent unless the average block time goes above this value */
  THRESHOLD = 'THRESHOLD',
  /** We log the stats to the logger every nth block */
  LOG_NTH_BLOCK = 'LOG_NTH_BLOCK',
  /** We alert on those channels */
  CHANNELS = 'CHANNELS',
}

/**
 * Blockstats observes the chain and process somes stats such as the 
 * average block time. It will raise an alert if the block time raises 
 * above a pre-defined threshold.
 */
@Callable({ alias: 'bstat' })
export default class BlockStats extends PolkabotWorker {
  private static readonly MODULE = 'BLOCKSTATS';
  private config: BlockStatsConfig;
  private data: Data[];
  private previousData?: Data;
  private stats;
  private currentBlock: BN;

  public constructor(mod: PluginModule, context: PluginContext, config?) {
    super(mod, context, config);

    // Calling this method in the ctor is mandatory
    PolkabotPluginBase.bindCommands(this);

    this.config = {
      nbBlocks: this.context.config.Get(BlockStats.MODULE, ConfigKeys.NB_BLOCKS), /// Size of the rolling buffer
      threshold: this.context.config.Get(BlockStats.MODULE, ConfigKeys.THRESHOLD), /// We remain silent unless the average goes above this value
      logNthBlock: this.context.config.Get(BlockStats.MODULE, ConfigKeys.LOG_NTH_BLOCK),
      channels: this.context.config.Get(BlockStats.MODULE, ConfigKeys.CHANNELS)
    };

    this.data = [];
    this.previousData = null;
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
        message: `<ul><li>Current block: ${this.currentBlock.toString(10)}</li><li>NB_BLOCKS: ${this.config.nbBlocks}</li><li>started: ${this.started}</li><ul>`
      }]
    };
  }

  public start(): void {
    super.start();
    this.context.logger.silly('BlocksStats - Starting with config: %o', this.config);

    this.watchChain().catch(error => {
      this.context.logger.error('BlocksStats - Error subscribing to chain head: %o', error);
    });
  }

  async watchChain(): Promise<void> {
    this.unsubs['subscribeNewHeads'] = await this.context.polkadot.rpc.chain.subscribeNewHeads((header: HeaderExtended) => {
      this.currentBlock = header.number.unwrap().toBn();

      if (this.currentBlock.mod(new BN(this.config.nbBlocks)).toString(10) === '0') {
        this.context.logger.debug(`BlocksStats - Chain is at block: #${header.number.unwrap().toBn()}, %o`, this.stats);
      }

      this.addBlock(header);

      if (this.currentBlock.mod(new BN(this.config.nbBlocks)).toString(10) === '0') {
        this.computeStats();
        this.alert(this.currentBlock);
      }
    });
  }

  /**
   * Add the block number and timestamp to a rolling buffer.
   * @param header 
   */
  addBlock(header: HeaderExtended): void {
    const data: Data = {
      tmsp: new Date().getTime(),
      blockTime: this.previousData ? new Date().getTime() - this.previousData.tmsp : null,
      header
    };
    this.data.push(data);

    while (this.data.length > this.config.nbBlocks) {
      this.data.shift();
    }
    this.previousData = data;
  }

  /** Computes the average block time */
  averageBlockTime(): number {
    const sum: (a: number, b: number) => number = (accumulator, currentValue) => accumulator + currentValue;
    return this.data.map(el => el.blockTime || 0).reduce(sum) / this.data.filter(item => item.blockTime > 0).length / 1000;
  }

  /** Computes the statistics (= the block time) */
  computeStats(): void {
    this.stats = {
      nbBlock: this.data.length,
      averageBlockTime: this.averageBlockTime()
    };
  }

  /** Send an alert when something bad happened */
  alert(bnBlockNumber): void {
    if (this.stats.averageBlockTime >= this.config.threshold) {
      const notifierMessage: NotifierMessage = {
        message: `WARNING: Average block time exceeded ${this.config.threshold.toFixed(3)}s
Stats for the last ${this.config.nbBlocks} at #${bnBlockNumber.toString(10)}:
    - Nb Blocks: ${this.stats.nbBlock}
    - Average Block time: ${this.stats.averageBlockTime.toFixed(3)}s`
      };

      const notifierSpecs: NotifierSpecs = {
        notifiers: this.config.channels
      };

      this.context.polkabot.notify(notifierMessage, notifierSpecs);
    }
  }
}
