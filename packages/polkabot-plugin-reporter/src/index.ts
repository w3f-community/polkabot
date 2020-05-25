import BN from 'bn.js';
import moment from 'moment';
import { PolkabotWorker } from '@polkabot/api/src/PolkabotWorker';
import blake2 from '@polkadot/util-crypto/blake2/asHex';
import { NotifierSpecs, PluginModule, PluginContext, BlockMoment, Announcement, Severity } from '@polkabot/api/src/types';

/**
 * This plugin is keeping an eye on on the public referendum and 
 * important changes that may happen on-chain.
 */
export default class Reporter extends PolkabotWorker {
  private cache: any;
  private unsub: Function;

  private notifierSpecs: NotifierSpecs = {
    notifiers: ['matrix'],
  };

  public constructor(mod: PluginModule, context: PluginContext, config?) {
    super(mod, context, config);
    this.cache = {};
  }

  /** Check the last blocks and figure out the block time.
   * This should gives around 6.0 seconds on Kusama.
   */
  async getAverageBlockTime(): Promise<number> {
    const NB_SAMPLES = 3; // less is faster
    const STEP = 10; // sample over a longer period
    let last = undefined;
    const durations = [];
    const api = this.context.polkadot;

    for (let i = this.cache.block, j = 0; j < NB_SAMPLES; j++, i -= STEP) {
      const h = await api.rpc.chain.getBlockHash(i);
      const now = new Date((await api.query.timestamp.now.at(h)).toNumber()).getTime() * 1.0;
      if (last) {
        durations.push((last - now) / 1000.0);
      }
      last = now;
    }
    return durations.reduce((a, b) => a + b) / durations.length / STEP;
  }

  /** Returns an object telling us when a block will/did show up */
  async getBlockMoment(block: BN): Promise<BlockMoment> {
    // const currentBlock = (await this.context.polkadot.rpc.chain.getBlock()).block.header.number.toNumber();
    const blockTime = await this.getAverageBlockTime();

    const h = await this.context.polkadot.rpc.chain.getBlockHash(this.cache.blockNumber);
    const now = new Date((await this.context.polkadot.query.timestamp.now.at(h)).toNumber());
    const future = block > this.cache.blockNumber;
    const other = new Date(
      now.getTime() + (this.cache.blockNumber as BN).sub(block).toNumber() * blockTime * 1000
    );
    const duration = Math.abs(now.getTime() - other.getTime()) / 1000;

    return {
      future,
      duration,
      date: other,
      message: `${moment(duration).fromNow()}`,
    };
  }

  public start(): void {
    // this.context.logger.info('Reporter - Starting with config:', this.config);
    this.watchChain().catch(error => {
      console.error('Reporter - Error subscribing to chain: ', error);
    });
  }

  public stop(): void {
    this.context.logger.info('Reporter - STOPPING');
    if (this.unsub)
      this.unsub();
  }

  private announce(message: Announcement): void {
    this.context.polkabot.notify(
      {
        message,
      },
      this.notifierSpecs
    );
  }

  buf2hex(buffer): string {
    // buffer is an ArrayBuffer
    return Array.prototype.map
      .call(new Uint8Array(buffer), x => ('00' + x.toString(16)).slice(-2))
      .join('');
  }

  async subscribeChainBlockHeader(): Promise<void> {
    this.unsub = await this.context.polkadot.rpc.chain.subscribeNewHeads(header => {
      const KEY = 'blockNumber';
      if (header) {
        this.cache[KEY] = header.number.unwrap().toBn();
      }
    });
  }

  async watchActiveValidatorCount(): Promise<void> {
    // const validatorsSubscriptionUnsub = // can be used to unsubscribe
    await this.context.polkadot.query.session.validators(validators => {
      const KEY = 'validators';

      if (!this.cache[KEY]) this.cache[KEY] = validators;
      if (this.cache[KEY] && this.cache[KEY].length !== validators.length) {
        this.context.logger.info('Reporter - Active Validator count: ', validators.length);

        this.announce({
          message: `Active Validator count has changed from ${this.cache[KEY].length} to ${validators.length}`,
          severity: Severity.INFO,
        });
        this.cache[KEY] = validators;
      } else {
        this.context.logger.info(`Reporter - Active Validator count: ${validators.length}`);
      }
    });
  }

  async watchValidatorSlotCount(): Promise<void> {
    await this.context.polkadot.query.staking.validatorCount(validatorCount => {
      const KEY = 'validatorCount';

      if (!this.cache[KEY]) this.cache[KEY] = validatorCount;
      if (this.cache[KEY] && this.cache[KEY] !== validatorCount) {
        this.cache[KEY] = validatorCount;
        this.context.logger.info('Reporter - Validator count:', validatorCount.toString(10));
        this.announce({
          message: `The number of validator slots has changed. It is now ${validatorCount.toString(
            10
          )}`,
          severity: Severity.IMPORTANT,
        });
      }
    });
  }

  async watchRuntimeCode(): Promise<void> {
    await this.context.polkadot.query.substrate.code(code => {
      const KEY = 'runtime';
      const hash = blake2(code, 16);

      if (!this.cache[KEY]) this.cache[KEY] = { hash, code };
      if (this.cache[KEY] && this.cache[KEY].hash !== hash) {
        this.cache[KEY] = { hash, code };
        this.context.logger.info('Reporter - Runtime Code hash changed:', hash);

        // const codeInHex = '0x' + this.buf2hex(code)
        // this.context.logger.info('Runtime Code hex changed', codeInHex)

        this.announce({
          message: `Runtime code hash has changed. The hash is now ${hash}. The runtime is now ${
            code ? (code.length / 1024).toFixed(2) : '???'
          } kb.`,
          severity: Severity.CRITICAL,
        });
      } else {
        this.context.logger.info(`Reporter - Runtime Code hash: ${hash}`);
      }
    });
  }

  // Extract a function to do that. It needs:
  //  - query path:  council.proposalCount for instance
  //  - our cache storage key: proposalCount. It could even be generated.
  //  - a transformation (optional) for the 'value'. For instance, for the runtime, we need to hash first.
  //  - a message template if the value changes
  async watchCouncilMotionsProposalCount(): Promise<void> {
    await this.context.polkadot.query.council.proposalCount(proposalCount => {
      const KEY = 'proposalCount';

      const count = new BN(proposalCount);
      if (!this.cache[KEY]) this.cache[KEY] = count;
      if (this.cache[KEY] && !this.cache[KEY].eq(count)) {
        this.cache[KEY] = count;

        this.context.logger.info('Reporter - Proposal count changed:', count.toString(10));
        const id = count.sub(new BN(1));
        this.announce({
          message: `A new council motion proposal is available (#${id}), check your UI at https://polkadot.js.org/apps/#/democracy.
You will be able to vote shortly, a new referendum will show up in the UI.`,
          severity: Severity.INFO,
        });
      } else {
        this.context.logger.info(`Reporter - Proposal count: ${count.toString(10)}`);
      }
    });
  }

  async watchPublicProposalCount(): Promise<void> {
    await this.context.polkadot.query.democracy.publicPropCount(async (publicPropCount: BN) => {
      const KEY = 'publicPropCount';
      this.context.logger.info('Reporter - publicPropCount:', publicPropCount.toString(10));

      const count = publicPropCount;
      if (!this.cache[KEY]) this.cache[KEY] = count;
      if (this.cache[KEY] && !this.cache[KEY].eq(count)) {
        this.cache[KEY] = count;
        const deadline = this.cache.blockNumber.add(this.context.polkadot.consts.democracy.votingPeriod) as BN;
        const blockMoment = await this.getBlockMoment(deadline);
        // const votingTimeInMinutes =
        //   parseInt(this.context.polkadot.consts.democracy.votingPeriod.mul(this.cache.minimumPeriod).toString(10)) / 60;
        this.context.logger.info('Reporter - Proposal count changed:', count.toString(10));
        const id = count.sub(new BN(1)).toString(10);

        this.announce({
          message: `@room New Proposal (#${id}) available. Check your UI at https://polkadot.js.org/apps/#/democracy.
          You can second Proposal #${id} during the next ${this.context.polkadot.consts.democracy.votingPeriod.toString(
  10
)} blocks. 
            That means a deadline at block #${deadline.toString(10)}, don't miss it! 
            the deadline to vote is ${moment(blockMoment.date).fromNow()}.`,
          severity: Severity.INFO,
        });
      } else {
        this.context.logger.info(`Reporter - Proposal count: ${count.toString(10)}`);
      }
    });
  }

  async watchReferendumCount(): Promise<void> {
    await this.context.polkadot.query.democracy.referendumCount(referendumCount => {
      const KEY = 'referendumCount';
      this.context.logger.info('Reporter - referendumCount:', referendumCount.toString(10));

      const count = new BN(referendumCount);
      if (!this.cache[KEY]) this.cache[KEY] = count;
      if (this.cache[KEY] && !this.cache[KEY].eq(count)) {
        this.cache[KEY] = count;
        const deadline = this.cache.blockNumber.add(
          this.context.polkadot.consts.democracy.votingPeriod
        );
        const votingTimeInMinutes =
          parseInt(
            this.context.polkadot.consts.democracy.votingPeriod
              .mul(this.cache.minimumPeriod)
              .toString(10)
          ) / 60;
        this.context.logger.info('Reporter - Referendum count changed:', count.toString(10));
        const id = count.sub(new BN(1)).toString(10);

        this.announce({
          message: `@room New referendum (#${id}) available. Check your UI at https://polkadot.js.org/apps/#/democracy.
You can vote for referendum #${id} during the next ${this.context.polkadot.consts.democracy.votingPeriod.toString(
  10
)} blocks. 
That means a deadline at block #${deadline.toString(10)}, don't miss it! 
You have around ${votingTimeInMinutes.toFixed(2)} minutes to vote.`,
          severity: Severity.INFO,
        });
      } else {
        this.context.logger.info(`Reporter - Referendum count: ${count.toString(10)}`);
      }
    });
  }

  async watchChain(): Promise<void> {
    await this.subscribeChainBlockHeader();

    // Validators
    await this.watchActiveValidatorCount();
    await this.watchValidatorSlotCount();

    // Runtime
    await this.watchRuntimeCode();

    // Council
    await this.watchCouncilMotionsProposalCount();

    // Democracy
    await this.watchPublicProposalCount();
    await this.watchReferendumCount();
  }
}
