#!/usr/bin/env node

import BN from "bn.js";
import {
  PolkabotWorker,
  NotifierMessage,
  NotifierSpecs,
  PluginModule,
  PluginContext
} from "@polkabot/api/src/plugin.interface";

type Data = {
  tmsp: number;
  blockTime: number;
  header: any;
};

export default class BlocsStats extends PolkabotWorker {
  public config: {
    NB_BLOCKS: number; // Size of the rolling buffer
    THRESHOLD: number; // We remain silent unless the average goes above this value
    LOG_NTH_BLOCK: number;
  };

  private data: Data[];
  private previousData?: Data;
  private stats;

  public constructor(mod: PluginModule, context: PluginContext, config?) {
    super(mod, context, config);

    // TODO replace the following by ENv 
    this.config = {
      NB_BLOCKS: 10, // Size of the rolling buffer
      THRESHOLD: 2.0, // We remain silent unless the average goes above this value
      LOG_NTH_BLOCK: 5
    };

    this.data = [];
    this.previousData = null;
  }

  public start(): void {
    console.log("BlocksStats - Starting with config:", this.config);
    this.watchChain().catch(error => {
      console.error("BlocksStats - Error subscribing to chain head: ", error);
    });
  }

  async watchChain() {
    // Reference: https://polkadot.js.org/api/examples/promise/02_listen_to_blocks/
    await this.context.polkadot.rpc.chain.subscribeNewHeads(header => {
      const bnBlockNumber: BN = header.number.unwrap().toBn();

      if (bnBlockNumber.mod(new BN(this.config.LOG_NTH_BLOCK)).toString(10) === "0") {
        console.log(`BlocksStats - Chain is at block: #${header.number.unwrap().toBn()}`, this.stats);
      }

      this.addBlock(header);

      if (bnBlockNumber.mod(new BN(this.config.NB_BLOCKS)).toString(10) === "0") {
        this.computeStats();
        this.alert(bnBlockNumber);
      }
    });
  }

  addBlock(header) {
    const data: Data = {
      tmsp: new Date().getTime(),
      blockTime: this.previousData ? new Date().getTime() - this.previousData.tmsp : null,
      header
    };
    this.data.push(data);

    while (this.data.length > this.config.NB_BLOCKS) {
      this.data.shift();
    }
    this.previousData = data;
  }

  averageBlockTime() {
    const sum = (accumulator, currentValue) => accumulator + currentValue;
    return this.data.map(el => el.blockTime || 0).reduce(sum) / this.data.filter(item => item.blockTime > 0).length / 1000;
  }

  computeStats() {
    this.stats = {
      nbBlock: this.data.length,
      averageBlockTime: this.averageBlockTime()
    };
  }

  alert(bnBlockNumber) {
    if (this.stats.averageBlockTime >= this.config.THRESHOLD) {
      const notifierMessage: NotifierMessage = {
        message: `WARNING: Average block time exceeded ${this.config.THRESHOLD.toFixed(3)}s
Stats for the last ${this.config.NB_BLOCKS} at #${bnBlockNumber.toString(10)}:
    - Nb Blocks: ${this.stats.nbBlock}
    - Average Block time: ${this.stats.averageBlockTime.toFixed(3)}s`
      };

      const notifierSpecs: NotifierSpecs = {
        notifiers: ["matrix", "twitter", "demo", "all"]
      };

      this.context.polkabot.notify(notifierMessage, notifierSpecs);

      //       this.context.matrix
      //         .sendTextMessage(
      //           this.context.config.matrix.roomId,
      //           `WARNING: Average block time exceeded ${this.config.THRESHOLD.toFixed(3)}s
      // Stats for the last ${this.config.NB_BLOCKS} at #${bnBlockNumber.toString(10)}:
      //     - Nb Blocks: ${this.stats.nbBlock}
      //     - Average Block time: ${this.stats.averageBlockTime.toFixed(3)}s`
      //         )
      //         .finally(function() {});
    }
  }
}
