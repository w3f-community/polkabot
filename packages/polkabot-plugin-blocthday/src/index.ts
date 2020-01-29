import BN from "bn.js";
import {
  PolkabotWorker,
  NotifierMessage,
  NotifierSpecs,
  PluginModule,
  PluginContext,
  CommandHandlerOutput,
  IControllable
} from "@polkabot/api/src/plugin.interface";
// import commands from "./commands";

export default class Blocthday extends PolkabotWorker implements IControllable {
  private NB_BLOCKS: number;

  private cmdStatus(...args: any[]): CommandHandlerOutput {
    console.log("Called cmdStatus with:", args);

    return {
      code: -1,
      msg: "Implement me first!"
    };
  }

  public constructor(mod: PluginModule, context: PluginContext, config?) {
    super(mod, context, config);
    this.NB_BLOCKS = parseInt(process.env.POLKABOT_PLUGIN_BLOCTHDAY_NB_BLOCKS) || 1000000;
    this.commands = {
      name: "Blocthday",
      alias: "bday",
      commands: [
        {
          name: "status",
          description: "Show status of the plugin",
          argsRegexp: "",
          handler: this.cmdStatus
        }
      ]
    };
  }

  public start(): void {
    console.log("Blocthday - Starting with NB_BLOCKS:", this.NB_BLOCKS);
    this.watchChain().catch(error => {
      console.error("Blocthday - Error subscribing to chain head: ", error);
    });
  }

  public stop(): void {
    console.log("Blocthday - STOPPING");

    // TODO: unsubscribe to everything here
  }

  async watchChain() {
    // Reference: https://polkadot.js.org/api/examples/promise/02_listen_to_blocks/
    await this.context.polkadot.rpc.chain.subscribeNewHeads(header => {
      console.log(`Blocthday - Chain is at block: #${header.number}`);
      const bnBlockNumber: BN = header.number.unwrap().toBn();
      const bnNumberOfBlocks: BN = new BN(this.NB_BLOCKS);

      if (bnBlockNumber.mod(bnNumberOfBlocks).toString(10) === "0") {
        const notifierMessage: NotifierMessage = {
          message: `Happy ${this.NB_BLOCKS}-BlocthDay!!! Polkadot is now at #${header.number}`
        };

        const notifierSpecs: NotifierSpecs = {
          notifiers: ["matrix", "twitter"]
        };

        this.context.polkabot.notify(notifierMessage, notifierSpecs);
      }
    });
  }
}
