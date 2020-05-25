#!/usr/bin/env node

import BN from 'bn.js';
import { PolkabotWorker } from '@polkabot/api/src/PolkabotWorker';
import { HeaderExtended } from '@polkadot/api-derive/type';
import { PluginModule, PluginContext, NotifierMessage, NotifierSpecs } from '@polkabot/api/src/types';

type Data = {
  tmsp: number;
  blockTime: number;
  header: HeaderExtended;
};

export default class BlocsStats extends PolkabotWorker {
  static NAME = 'BLOCKSTATS'

  public params: {
    NB_BLOCKS: number; // Size of the rolling buffer
    THRESHOLD: number; // We remain silent unless the average goes above this value
    LOG_NTH_BLOCK: number;
  };

  private data: Data[];
  private previousData?: Data;
  private stats;
  private unsubHandler = {
    newHead: null
  };

  public constructor(mod: PluginModule, context: PluginContext, config?) {
    super(mod, context, config);

    this.params = {
      NB_BLOCKS: context.config.Get(BlocsStats.NAME, 'NB_BLOCKS'), /// Size of the rolling buffer
      THRESHOLD: context.config.Get(BlocsStats.NAME, 'THRESHOLD'), /// We remain silent unless the average goes above this value
      LOG_NTH_BLOCK: context.config.Get(BlocsStats.NAME, 'LOG_NTH_BLOCK')
    };

    this.data = [];
    this.previousData = null;
  }

  public start(): void {
    console.log('BlocksStats - Starting with config:', this.params);
    this.watchChain().catch(error => {
      console.error('BlocksStats - Error subscribing to chain head: ', error);
    });
  }

  public stop(): void {
    if (this.unsubHandler.newHead)
      this.unsubHandler.newHead();
  }

  async watchChain(): Promise<void> {
    // Reference: https://polkadot.js.org/api/examples/promise/02_listen_to_blocks/
    this.unsubHandler.newHead = await this.context.polkadot.rpc.chain.subscribeNewHeads(header => {
      const bnBlockNumber: BN = header.number.unwrap().toBn();

      if (bnBlockNumber.mod(new BN(this.params.LOG_NTH_BLOCK)).toString(10) === '0') {
        console.log(`BlocksStats - Chain is at block: #${header.number.unwrap().toBn()}`, this.stats);
      }

      this.addBlock(header);

      if (bnBlockNumber.mod(new BN(this.params.NB_BLOCKS)).toString(10) === '0') {
        this.computeStats();
        this.alert(bnBlockNumber);
      }
    });
  }

  addBlock(header: HeaderExtended): void {
    const data: Data = {
      tmsp: new Date().getTime(),
      blockTime: this.previousData ? new Date().getTime() - this.previousData.tmsp : null,
      header
    };
    this.data.push(data);

    while (this.data.length > this.params.NB_BLOCKS) {
      this.data.shift();
    }
    this.previousData = data;
  }

  averageBlockTime(): number {
    const sum: (a: number, b: number) => number = (accumulator, currentValue) => accumulator + currentValue;
    return this.data.map(el => el.blockTime || 0).reduce(sum) / this.data.filter(item => item.blockTime > 0).length / 1000;
  }

  computeStats(): void {
    this.stats = {
      nbBlock: this.data.length,
      averageBlockTime: this.averageBlockTime()
    };
  }

  alert(bnBlockNumber): void {
    if (this.stats.averageBlockTime >= this.params.THRESHOLD) {
      const notifierMessage: NotifierMessage = {
        message: `WARNING: Average block time exceeded ${this.params.THRESHOLD.toFixed(3)}s
Stats for the last ${this.params.NB_BLOCKS} at #${bnBlockNumber.toString(10)}:
    - Nb Blocks: ${this.stats.nbBlock}
    - Average Block time: ${this.stats.averageBlockTime.toFixed(3)}s`
      };

      const notifierSpecs: NotifierSpecs = {
        notifiers: ['matrix', 'twitter', 'demo', 'all']
      };

      this.context.polkabot.notify(notifierMessage, notifierSpecs);

      //       this.context.matrix
      //         .sendTextMessage(
      //           this.context.config.matrix.roomId,
      //           `WARNING: Average block time exceeded ${this.params.THRESHOLD.toFixed(3)}s
      // Stats for the last ${this.params.NB_BLOCKS} at #${bnBlockNumber.toString(10)}:
      //     - Nb Blocks: ${this.stats.nbBlock}
      //     - Average Block time: ${this.stats.averageBlockTime.toFixed(3)}s`
      //         )
      //         .finally(function() {});
    }
  }
}
