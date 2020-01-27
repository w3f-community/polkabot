import BN from "bn.js";
import {
  PolkabotWorker,
  NotifierMessage,
  NotifierSpecs,
  PluginModule,
  PluginContext
} from "@polkabot/api/src/plugin.interface";

// TODO: Will move to hash later on
// import xxhash from "@polkadot/util-crypto/xxhash/xxhash64/asHex";
import blake2 from "@polkadot/util-crypto/blake2/asHex";

enum Severity {
  INFO,
  WARNING,
  IMPORTANT,
  CRITICAL
}

type Announcement = {
  severity: Severity;  
  message: string;
}
  
export default class Reporter extends PolkabotWorker {
  private cache: any; // TODO FIXME
  private notifierSpecs: NotifierSpecs = {
    notifiers: ["matrix"]
  };

  public constructor(mod: PluginModule, context: PluginContext, config?) {
    super(mod, context, config);
    this.cache = {};
    this.config = {};
  }

  public start(): void {
    console.log("Reporter - Starting with config:", this.config);
    this.watchChain().catch(error => {
      console.error("Reporter - Error subscribing to chain: ", error);
    });
  }


  // TODO: switch from string to Announcement
  private announce(message: string ) {
    this.context.polkabot.notify(
      {
        message
      },
      this.notifierSpecs
    );
  }

  buf2hex(buffer) {
    // buffer is an ArrayBuffer
    return Array.prototype.map.call(new Uint8Array(buffer), x => ("00" + x.toString(16)).slice(-2)).join("");
  }

  async subscribeChainBlockHeader() {
    await this.context.polkadot.rpc.chain.subscribeNewHeads(header => {
      const KEY = "blockNumber";
      if (header) {
        this.cache[KEY] = header.number.unwrap().toBn();
      }
    });
  }

  async watchActiveValidatorCount() {
    // const validatorsSubscriptionUnsub = // can be used to unsubscribe
    await this.context.polkadot.query.session.validators(validators => {
      const KEY = "validators";

      if (!this.cache[KEY]) this.cache[KEY] = validators;
      if (this.cache[KEY] && this.cache[KEY].length !== validators.length) {
        console.log("Reporter - Active Validator count: ", validators.length);
        this.announce(`Active Validator count has changed from ${this.cache[KEY].length} to ${validators.length}`);
        this.cache[KEY] = validators;
      } else {
        console.log(`Reporter - Active Validator count: ${validators.length}`);
      }
    });
  }

  async watchValidatorSlotCount() {
    await this.context.polkadot.query.staking.validatorCount(validatorCount => {
      const KEY = "validatorCount";

      if (!this.cache[KEY]) this.cache[KEY] = validatorCount;
      if (this.cache[KEY] && this.cache[KEY] !== validatorCount) {
        this.cache[KEY] = validatorCount;
        console.log("Reporter - Validator count:", validatorCount.toString(10));
        this.announce(`The number of validator slots has changed. It is now ${validatorCount.toString(10)}`);
      }
    });
  }

  async watchRuntimeCode() {
    await this.context.polkadot.query.substrate.code(code => {
      const KEY = "runtime";
      const hash = blake2(code, 16);

      if (!this.cache[KEY]) this.cache[KEY] = { hash, code };
      if (this.cache[KEY] && this.cache[KEY].hash !== hash) {
        this.cache[KEY] = { hash, code };
        console.log("Reporter - Runtime Code hash changed:", hash);

        // const codeInHex = '0x' + this.buf2hex(code)
        // console.log('Runtime Code hex changed', codeInHex)

        this.announce(
          `Runtime code hash has changed. The hash is now ${hash}. The runtime is now ${
            code ? (code.length / 1024).toFixed(2) : "???"
          } kb.`
        );
      } else {
        console.log(`Reporter - Runtime Code hash: ${hash}`);
      }
    });
  }

  // Extract a function to do that. It needs:
  //  - query path:  council.proposalCount for instance
  //  - our cache storage key: proposalCount. It could even be generated.
  //  - a transformation (optional) for the 'value'. For instance, for the runtime, we need to hash first.
  //  - a message template if the value changes
  async watchCouncilMotionsProposalCount() {
    await this.context.polkadot.query.council.proposalCount(proposalCount => {
      const KEY = "proposalCount";

      const count = new BN(proposalCount);
      if (!this.cache[KEY]) this.cache[KEY] = count;
      if (this.cache[KEY] && !this.cache[KEY].eq(count)) {
        this.cache[KEY] = count;

        console.log("Reporter - Proposal count changed:", count.toString(10));
        const id = count.sub(new BN(1));
        this.announce(
          `A new council motion proposal is available (#${id}), check your UI at https://polkadot.js.org/apps/#/democracy.
  You will be able to vote shortly, a new referendum will show up in the UI.`
        );
      } else {
        console.log(`Reporter - Proposal count: ${count.toString(10)}`);
      }
    });
  }

  async watchReferendumCount() {
    await this.context.polkadot.query.democracy.referendumCount(referendumCount => {
      const KEY = "referendumCount";
      console.log("Reporter - referendumCount:", referendumCount.toString(10));

      const count = new BN(referendumCount);
      if (!this.cache[KEY]) this.cache[KEY] = count;
      if (this.cache[KEY] && !this.cache[KEY].eq(count)) {
        this.cache[KEY] = count;
        const deadline = this.cache.blockNumber.add(this.cache.votingPeriod);
        const votingTimeInMinutes = parseInt(this.cache.votingPeriod.mul(this.cache.minimumPeriod).toString(10)) / 60;
        console.log("Reporter - Referendum count changed:", count.toString(10));
        const id = count.sub(new BN(1)).toString(10);

        this.announce(
          `@room New referendum (#${id}) available. Check your UI at https://polkadot.js.org/apps/#/democracy.
  You can vote for referendum #${id} during the next ${this.cache.votingPeriod.toString(10)} blocks. 
  That means a deadline at block #${deadline.toString(10)}, don't miss it! 
  You have around ${votingTimeInMinutes.toFixed(2)} minutes to vote.`
        );
      } else {
        console.log(`Reporter - Referendum count: ${count.toString(10)}`);
      }
    });
  }

  async watchChain() {
    await this.subscribeChainBlockHeader();
    await this.watchActiveValidatorCount();
    await this.watchValidatorSlotCount();
    await this.watchRuntimeCode();
    await this.watchCouncilMotionsProposalCount();
    await this.watchReferendumCount();
  }
}
