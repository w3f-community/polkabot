import BN from 'bn.js';
import { PolkabotWorker } from '@polkabot/api/src/PolkabotWorker';
import { HeaderExtended } from '@polkadot/api-derive/type';
import { Command, Callable, Trace } from '@polkabot/api/src/decorators';
import { PluginModule, PluginContext, Room, CommandHandlerOutput, NotifierMessage, ErrorCode, Controllable } from '@polkabot/api/src/types';
import { PolkabotPluginBase, assert } from '@polkabot/api/src';

export type Channel = {
  type: 'matrix' | 'twitter';
  rooms: string[]
}

export type WatchedRepo = {
  repo: string;
  channels: Channel[]
}

/**
 * This is a convenience to describe the config expected by the plugin.
 * Most of the fields should be available in the config (See confmgr).
 */
export type RepoMonitorConfig = {
  watchlist: {
    [provider: string]: WatchedRepo[]
  }
}

/**
 * Convenience to avoid typos.
 */
export enum ConfigKeys {
  TOKEN_GITHUB = 'TOKEN_GITHUB',
  TOKEN_GITLAB = 'TOKEN_GITLAB',
  REPOS = 'REPOS'
}

/**
 * This plugin watches repos
 */
@Callable({ alias: 'repo' })
export default class RepoMonitor extends PolkabotWorker {
  private static readonly MODULE = 'REPO_MONITOR';
  private config: RepoMonitorConfig;

  public constructor(mod: PluginModule, context: PluginContext, config?) {
    super(mod, context, config);

    // Calling this method in the ctor is mandatory
    PolkabotPluginBase.bindCommands(this);

    this.config = {
      watchlist: this.context.config.Get(RepoMonitor.MODULE, ConfigKeys.REPOS)
    };

    // TODO: It seems we dont get the channels arrray, we may need to override at first

    this.context.logger.silly('++ RepoMonitor, config: %o', this.config);
  }

  /**
   * This command shows the status of the plugin.
   * @param _event 
   * @param room 
   */
  @Command({ description: 'Show status of the plugin' })
  @Trace()
  public cmdStatus(_event, room: Room): CommandHandlerOutput {
    return {
      code: ErrorCode.Ok,
      logMsg: `Answering the status command`,
      answers: [{
        room,
        // TODO: Missing implementation
        message: `Here we could provide the list of watched repos`
      }]
    };
  }

  public start(): void {
    super.start();
    this.context.logger.silly('Starting RepoMonitor with config set to %o', this.config);

    this.watchRepos().catch(error => {
      this.context.logger.error('Error watching repos: %o', error);
    });
  }

  /**
   * Start watching the chain.
   * See https://polkadot.js.org/api/examples/promise/02_listen_to_blocks/
   */
  async watchRepos(): Promise<void> {
    this.context.logger.silly('Watching repos...');

    Object.keys(this.config.watchlist).forEach((provider, _index) => {
      this.context.logger.info(`Provider: ${provider}`)
      const repos = this.config.watchlist[provider]
      Object.keys(repos).forEach(key => {
        const watchedRepo = repos[key]

        this.context.logger.info(`  - repo: ${JSON.stringify(watchedRepo)}`)
        this.context.logger.info(`  - repo: ${JSON.stringify(watchedRepo.repo)}`)
        this.context.logger.info(`  - channels: ${JSON.stringify(watchedRepo.channels)}`)
      })
    })
  }
}
