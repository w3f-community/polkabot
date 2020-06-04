import BN from 'bn.js';
import moment from 'moment';
import { PolkabotWorker } from '@polkabot/api/src/PolkabotWorker';
import blake2 from '@polkadot/util-crypto/blake2/asHex';
import { PluginModule, PluginContext, BlockMoment, Announcement, Severity } from '@polkabot/api/src/types';
import { HeaderExtended } from '@polkadot/api-derive/type';
import { Callable, Command } from '@polkabot/api/src/decorators';
import { PolkabotPluginBase, Room, CommandHandlerOutput } from '@polkabot/api/src';
import { logCache } from './helpers';

/**
 * This is a convenience to describe the config expected by the plugin.
 * Most of the fields should be available in the config (See confmgr).
 */
export type ReporterConfig = {
  /** The list of channels we notify */
  channels: string[];
  observed: {
    [key: string]: string[];
  };
  blockViewer: string;
}

/**
 * Convenience to avoid typos.
 */
enum ConfigKeys {
  CHANNELS = 'CHANNELS',
  OBSERVED = 'OBSERVED',
  BLOCK_VIEWER = 'BLOCK_VIEWER'
}

// TODO: We can do better than that!
type Validators = Array<any>

type Hash = string;
type WasmBlob = string; // TODO: probably not...
type RuntimeCache = {
  hash: Hash;
  code: WasmBlob;
}

/**
 * To avoid typos that would lead to issues, we declare all the keys we plan on using in our cache here.
 */
export enum CacheKeys {
  validators = 'validators',
  validatorCount = 'validatorCount',
  runtime = 'runtime',
  proposalCount = 'proposalCount',
  publicPropCount = 'publicPropCount',
  referendumCount = 'referendumCount',
  blockNumber = 'blockNumber'
}

export type ReporterCache = {
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
      observed: this.context.config.Get(Reporter.MODULE, ConfigKeys.OBSERVED),
      blockViewer: this.context.config.Get(Reporter.MODULE, ConfigKeys.BLOCK_VIEWER),
    };

    this.cache = {};
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

  /** Check the last blocks and figure out the block time.
   * This should gives around 6.0 seconds on Kusama.
   */
  async getAverageBlockTime(): Promise<number> {
    const NB_SAMPLES = 3; // less is faster
    const STEP = 10; // sample over a longer period
    let last = undefined;
    const durations = [];
    const api = this.context.polkadot;

    for (let i = this.cache.blockNumber as BN, j = 0; j < NB_SAMPLES; j++, i = i.sub(new BN(STEP))) {
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

    this.context.logger.silly('Starting with config: %o', this.config);
    this.watchChain().catch(error => {
      console.error('Error subscribing to chain: %o', error);
    });
  }

  private announce(announcement: Announcement): void {
    this.context.polkabot.notify({ message: announcement.message }, { notifiers: this.config.channels });
  }

  async subscribeChainBlockHeader(): Promise<void> {
    this.unsubs['subscribeNewHeads'] = await this.context.polkadot.rpc.chain.subscribeNewHeads((header: HeaderExtended) => {
      const KEY = CacheKeys.blockNumber;
      if (header) {
        this.cache[KEY] = header.number.unwrap().toBn();
      }
    });
  }

  /**
   * @deprecated This is no longer very relevant
   */
  async watchActiveValidatorCount(): Promise<void> {
    await this.context.polkadot.query.session.validators((validators: Validators) => {
      const KEY = CacheKeys.validators;
      let cache = this.cache[KEY] as Validators;

      if (!cache) {
        cache = validators;
        logCache.bind(this)(cache, KEY);
      }
      if (cache && cache.length !== validators.length) {
        this.context.logger.info('Active Validator count: %d', validators.length);

        this.announce({
          message: `Active Validator count has changed from ${cache.length} to ${validators.length}`,
          severity: Severity.INFO,
        });
        cache = validators;
      } else {
        this.context.logger.info(`Active Validator count: ${validators.length}`);
      }
    });
  }

  /**
   * @deprecated This is no longer very relevant
   */
  async watchValidatorSlotCount(): Promise<void> {
    await this.context.polkadot.query.staking.validatorCount((validatorCount: number) => {
      const KEY = CacheKeys.validatorCount;
      let cache = this.cache[KEY] as number;

      if (!cache) {
        cache = validatorCount;
        logCache.bind(this)(cache, KEY);
      }
      if (cache && cache !== validatorCount) {
        cache = validatorCount;
        this.context.logger.info('Validator count: %d', validatorCount.toString(10));
        this.announce({
          message: `The number of validator slots has changed. It is now ${validatorCount.toString(
            10
          )}`,
          severity: Severity.IMPORTANT,
        });
      }
    });
  }

  /**
   * we check for runtime upgrades
   */
  async watchRuntimeCode(): Promise<void> {
    await this.context.polkadot.query.substrate.code((code: WasmBlob) => {
      const KEY = CacheKeys.runtime;
      const hash = blake2(code, 64) as Hash;
      let cache = this.cache[KEY] as RuntimeCache;

      if (!cache) {
        cache = { hash, code };
        logCache.bind(this)(cache, KEY);
      }
      if (cache && cache.hash !== hash) {
        cache = { hash, code };
        this.context.logger.info('Runtime Code hash changed: %o', hash);

        // const codeInHex = '0x' + this.buf2hex(code)
        // this.context.logger.info('Runtime Code hex changed', codeInHex)

        this.announce({
          message: `Runtime code hash has changed. The hash is now ${hash}. The runtime is now ${
            code ? (code.length / 1024).toFixed(2) : '???'
          } kb.`,
          severity: Severity.CRITICAL,
        });
      } else {
        this.context.logger.info(`Runtime Code hash: ${hash}`);
      }
    });
  }

  /**
   * Extract a function to do that. It needs:
   *  - query path:  council.proposalCount for instance
   *  - our cache storage key: proposalCount. It could even be generated.
   *  - a transformation (optional) for the 'value'. For instance, for the runtime, we need to hash first.
   *  - a message template if the value changes
   * 
   * @deprecated we now use events
   */
  async watchCouncilMotionsProposalCount(): Promise<void> {
    await this.context.polkadot.query.council.proposalCount((proposalCount: number) => {
      const KEY = CacheKeys.proposalCount;
      let cache = this.cache[KEY] as BN;

      const count = new BN(proposalCount);
      if (!cache) {
        cache = count;
        logCache.bind(this)(cache, KEY);
      }
      if (cache && !cache.eq(count)) {
        cache = count;

        this.context.logger.info('Proposal count changed: %s', count.toString(10));
        const id = count.sub(new BN(1));
        this.announce({
          message: `A new council motion proposal is available (#${id}), check your UI at https://polkadot.js.org/apps/#/democracy.
You will be able to vote shortly, a new referendum will show up in the UI.`,
          severity: Severity.INFO,
        });
      } else {
        this.context.logger.info(`Proposal count: ${count.toString(10)}`);
      }
    });
  }

  /**
   * @deprecated we now use events
   */
  async watchPublicProposalCount(): Promise<void> {
    await this.context.polkadot.query.democracy.publicPropCount(async (count: BN) => {
      const KEY = CacheKeys.publicPropCount;
      this.context.logger.info('publicPropCount: %s', count.toString(10));
      let cache = this.cache[KEY] as BN;

      if (!cache) {
        cache = count;
        logCache.bind(this)(cache, KEY);
      }
      if (cache && !cache.eq(count)) {
        cache = count;
        const deadline = (this.cache.blockNumber as BN).add(this.context.polkadot.consts.democracy.votingPeriod) as BN;
        const blockMoment = await this.getBlockMoment(deadline);
        // const votingTimeInMinutes =
        //   parseInt(this.context.polkadot.consts.democracy.votingPeriod.mul(this.cache.minimumPeriod).toString(10)) / 60;
        this.context.logger.info('Proposal count changed: %s', count.toString(10));
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
        this.context.logger.info(`Proposal count: ${count.toString(10)}`);
      }
    });
  }

  /**
   * @deprecated we now use events
   */
  async watchReferendumCount(): Promise<void> {
    await this.context.polkadot.query.democracy.referendumCount((referendumCount: number) => {
      const KEY = CacheKeys.referendumCount;
      this.context.logger.info('referendumCount: %s', referendumCount.toString(10));
      let cache = this.cache[KEY] as BN;

      const count = new BN(referendumCount);
      if (!cache) {
        cache = count;
        logCache.bind(this)(cache, KEY);
      }
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
        this.context.logger.info('Referendum count changed: %s', count.toString(10));
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
        this.context.logger.info(`Referendum count: ${count.toString(10)}`);
      }
    });
  }

  /**
   * This method allows us to watch for a list of specific events.
   * The list is defined by configuration and should exclude any of the frequent events
   * such as system:ExtrinsicSuccess so we 'bother' the users as less as possible.
   */
  async watchEvents(): Promise<void> {
    const api = this.context.polkadot;

    this.unsubs['events'] = api.query.system.events((events) => {
      events.forEach((record) => {
        const { event, _phase } = record;
        const _types = event.typeDef;
        if (Object.keys(this.config.observed).includes(event.section)) {
          if (this.config.observed[event.section].includes(event.method)) {

            const doc = event.meta.documentation.map((d) => d.toString()).join(', ');
            this.announce({
              message: `📰 @room A new interesting event occured in block #${this.cache[CacheKeys.blockNumber]}:\n${event.section}:${event.method} - ${doc} You can check it out at ${this.config.blockViewer}${this.cache[CacheKeys.blockNumber]}`,
              severity: Severity.INFO,
            });

            this.context.logger.info('%s:%s %o', event.section, event.method, doc);
            this.context.logger.silly(JSON.stringify(event, null, 2));
          }
          else {
            this.context.logger.silly('Unsupported METHOD: %s:%s', event.section, event.method);
          }
        }
        else {
          this.context.logger.silly('Unsupported MODULE: %s', event.section);
        }
        // loop through each of the parameters, displaying the type and data
        //event.data.forEach((data, index) => {
        //  console.log(types[index].type + ';' + data.toString());
        //});
      });
    });
  }

  async watchChain(): Promise<void> {
    // Blocks
    await this.subscribeChainBlockHeader();

    // Validators
    // await this.watchActiveValidatorCount();
    // await this.watchValidatorSlotCount();

    // Runtime
    await this.watchRuntimeCode();

    // Council
    if (this.context.polkadot.query.council) {
      await this.watchCouncilMotionsProposalCount();
    }
    else {
      this.context.logger.warn('No council nodule, not watching');
    }

    // Democracy
    if (this.context.polkadot.query.democracy) {
      await this.watchPublicProposalCount();
      await this.watchReferendumCount();
    } else {
      this.context.logger.warn('No democracy nodule, not watching');
    }

    await this.watchEvents();
  }
}
