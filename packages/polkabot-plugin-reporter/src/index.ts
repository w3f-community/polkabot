import BN from 'bn.js';
import moment from 'moment';
import { PolkabotWorker } from '@polkabot/api/src/PolkabotWorker';
import blake2 from '@polkadot/util-crypto/blake2/asHex';
import { PluginModule, PluginContext, BlockMoment, Announcement, Severity } from '@polkabot/api/src/types';
import { HeaderExtended } from '@polkadot/api-derive/type';
import { Callable } from '@polkabot/api/src/decorators';
import { PolkabotPluginBase } from '@polkabot/api/src';

/**
 * This is a convenience to describe the config expected by the plugin.
 * Most of the fields should be available in the config (See confmgr).
 */
export type ReporterConfig = {
  /** The list of channels we notify */
  channels: string[];
}

/**
 * Convenience to avoid typos.
 */
enum ConfigKeys {
  CHANNELS = 'CHANNELS',
}

// TODO: We can do better than that!
type Validators = Array<any>


type Hash = string;
type WasmBlob = string; // TODO: probably not...
type RuntimeCache = {
  hash: Hash;
  code: WasmBlob;
}

type CacheKey = 'validators' | 'validatorCount' | 'runtime' | 'proposalCount' | 'publicPropCount' | 'referendumCount' | 'blockNumber'

type ReporterCache = {
  [key: string]: BN | Validators | string | number | RuntimeCache;
}


/**
 * This plugin is keeping an eye on on the public referendum and 
 * important changes that may happen on-chain. It also notifies when the runtime
 * is changing.
 */
@Callable({ alias: 'rp' })
export default class Reporter extends PolkabotWorker {
  private static readonly MODULE = 'REPORTER';
  private config: ReporterConfig;

  private cache: ReporterCache;

  public constructor(mod: PluginModule, context: PluginContext, config?) {
    super(mod, context, config);

    // Calling this method in the ctor is mandatory
    PolkabotPluginBase.bindCommands(this);

    this.config = {
      channels: this.context.config.Get(Reporter.MODULE, ConfigKeys.CHANNELS),
    };

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

    for (let i = this.cache.blockNumber as BN, j = 0; j < NB_SAMPLES; j++, i = i.sub (new BN(STEP))) {
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
    super.start();

    this.context.logger.silly('Reporter - Starting with config: %o', this.config);
    this.watchChain().catch(error => {
      console.error('Reporter - Error subscribing to chain: ', error);
    });
  }

  private announce(message: Announcement): void {
    this.context.polkabot.notify({ message }, { notifiers: this.config.channels });
  }

  async subscribeChainBlockHeader(): Promise<void> {
    this.unsubs['subscribeNewHeads'] = await this.context.polkadot.rpc.chain.subscribeNewHeads((header: HeaderExtended) => {
      const KEY: CacheKey = 'blockNumber';
      if (header) {
        this.cache[KEY] = header.number.unwrap().toBn();
      }
    });
  }

  async watchActiveValidatorCount(): Promise<void> {
    await this.context.polkadot.query.session.validators((validators: Validators) => {
      const KEY: CacheKey = 'validators';
      let cache = this.cache[KEY] as Validators;

      if (!cache) cache = validators;
      if (cache && cache.length !== validators.length) {
        this.context.logger.info('Reporter - Active Validator count: ', validators.length);

        this.announce({
          message: `Active Validator count has changed from ${cache.length} to ${validators.length}`,
          severity: Severity.INFO,
        });
        cache = validators;
      } else {
        this.context.logger.info(`Reporter - Active Validator count: ${validators.length}`);
      }
    });
  }

  async watchValidatorSlotCount(): Promise<void> {
    await this.context.polkadot.query.staking.validatorCount((validatorCount: number) => {
      const KEY: CacheKey = 'validatorCount';
      let cache = this.cache[KEY] as number;

      if (!cache) cache = validatorCount;
      if (cache && cache !== validatorCount) {
        cache = validatorCount;
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
    await this.context.polkadot.query.substrate.code((code: WasmBlob) => {
      const KEY: CacheKey = 'runtime';
      const hash = blake2(code, 16) as Hash;
      let cache = this.cache[KEY] as RuntimeCache;

      if (!cache) cache = { hash, code };
      if (cache && cache.hash !== hash) {
        cache = { hash, code };
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
    await this.context.polkadot.query.council.proposalCount((proposalCount: number) => {
      const KEY: CacheKey = 'proposalCount';
      let cache = this.cache[KEY] as BN;

      const count = new BN(proposalCount);
      if (!cache) cache = count;
      if (cache && !cache.eq(count)) {
        cache = count;

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
    await this.context.polkadot.query.democracy.publicPropCount(async (count: BN) => {
      const KEY: CacheKey = 'publicPropCount';
      this.context.logger.info('Reporter - publicPropCount:', count.toString(10));
      let cache = this.cache[KEY] as BN;

      if (!cache) cache = count;
      if (cache && !cache.eq(count)) {
        cache = count;
        const deadline = (this.cache.blockNumber as BN).add(this.context.polkadot.consts.democracy.votingPeriod) as BN;
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
    await this.context.polkadot.query.democracy.referendumCount((referendumCount: number) => {
      const KEY: CacheKey = 'referendumCount';
      this.context.logger.info('Reporter - referendumCount:', referendumCount.toString(10));
      let cache = this.cache[KEY] as BN;

      const count = new BN(referendumCount);
      if (!cache) cache = count;
      if (cache && !cache.eq(count)) {
        cache = count;
        const deadline = (this.cache.blockNumber as BN).add(
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
    // Blocks
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
