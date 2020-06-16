import BN from 'bn.js';
import moment from 'moment';
import { PolkabotWorker } from '@polkabot/api/src/PolkabotWorker';
import blake2 from '@polkadot/util-crypto/blake2/asHex';
import { PluginModule, PluginContext, BlockMoment, Announcement, Severity } from '@polkabot/api/src/types';
import { HeaderExtended } from '@polkadot/api-derive/type';
import { Callable, Command } from '@polkabot/api/src/decorators';
import { PolkabotPluginBase, Room, CommandHandlerOutput } from '@polkabot/api/src';
import { logCache, filterEvents } from './helpers';
import { EventRecord } from '@polkadot/types/interfaces/system';

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

type Hash = string;
type WasmBlob = string;
type RuntimeCache = {
  hash: Hash;
  code: WasmBlob;
}

/**
 * To avoid typos that would lead to issues, we declare all the keys we plan on using in our cache here.
 */
export enum CacheKeys {
  validatorCount = 'validatorCount',
  runtime = 'runtime',
  proposalCount = 'proposalCount',
  publicPropCount = 'publicPropCount',
  referendumCount = 'referendumCount',
  blockNumber = 'blockNumber',
  lastBlockDate = 'lastBlockDate'
}

export type ReporterCache = {
  [key: string]: BN | string | number | RuntimeCache | Date;
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
      if (header) {
        this.cache[CacheKeys.blockNumber] = header.number.unwrap().toBn();
        this.cache[CacheKeys.lastBlockDate] = new Date();
      }
    });
  }

  /**
   * This function is a little trick.
   * As of writting, random events do not provide the block number.
   * Subscribing both to events and newHeads is no solution as you may
   * have race conditions making one or the other event showing up first.
   * An aletrnative would be to QUERY events in a block instead of 
   * listening to events.
   * For now, we check out the time of the last block. If the last known
   * block is older than 1s we assume we have the right block. If not,
   * we consider that a new block came in.
   */
  private getBlockNumber(): BN {
    const lastBlockTime = (this.cache[CacheKeys.lastBlockDate] as Date).getTime();
    const now = Date.now();
    this.context.logger.debug('lastBlockTime: %d   now: %d', lastBlockTime, now);
    if (now <= lastBlockTime + 2500)
      return this.cache[CacheKeys.blockNumber] as BN;
    else
      return (this.cache[CacheKeys.blockNumber] as BN).add(new BN(1));
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
        this.context.logger.info('📃 Runtime Code hash changed: %o', hash);

        // const codeInHex = '0x' + this.buf2hex(code)
        // this.context.logger.info('Runtime Code hex changed', codeInHex)

        this.announce({
          message: `📃 Runtime code hash has changed. The hash is now ${hash}. The runtime is now ${
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

        this.context.logger.info('🦸 Proposal count changed: %s', count.toString(10));
        const id = count.sub(new BN(1));
        this.announce({
          message: `🦸 New council motion proposal is available (#${id}), check your UI at https://polkadot.js.org/apps/#/democracy.
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
          message: `🆎 ew Proposal (#${id}) available. Check your UI at https://polkadot.js.org/apps/#/democracy.
You can second Proposal #${id} during the next ${this.context.polkadot.consts.democracy.votingPeriod.toString(10)} blocks. 
That means a deadline at block #${deadline.toString(10)}, don't miss it! 
The deadline to vote is ${moment(blockMoment.date).fromNow()}.`,
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
          message: `New referendum (#${id}) available. Check your UI at https://polkadot.js.org/apps/#/democracy.
You can vote for referendum #${id} during the next ${this.context.polkadot.consts.democracy.votingPeriod.toString(10)} blocks. 
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

    this.unsubs['events'] = api.query.system.events((events: EventRecord[]) => {
      this.context.logger.silly(`Got ${events.length} events`);
      const filteredEvents = filterEvents(events, this.config.observed);
      this.context.logger.silly(`After filtering, we have ${filteredEvents.length} events`);

      const blockNumber = this.getBlockNumber();
      let message = `📰 Something interesting (${filteredEvents.length} events) occured in block #${blockNumber}\n`;
  
      let index = 0;
      for (const record of filteredEvents) {
        const { event } = record;
        const doc = event.meta.documentation.map((d) => d.toString()).join(', ');

        if (index++ < 5)
          message += `- ${event.section}:${event.method} - ${doc}\n`;
        else {
          message += '... and some more...\n';
          break;
        }

        this.context.logger.info('%s:%s %o', event.section, event.method, doc);
      }

      message += `You can check it out at ${this.config.blockViewer}${blockNumber}`;

      if (filteredEvents.length) {
        this.context.polkabot.notify({ message }, { notifiers: this.config.channels });
      }
    });
  }

  async watchChain(): Promise<void> {
    // Blocks
    await this.subscribeChainBlockHeader();

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
