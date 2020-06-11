import { PolkabotNotifier } from '../../polkabot-api/src/PolkabotNotifier';
import { PluginModule, PluginContext, NotifierMessage, NotifierSpecs } from '../../polkabot-api/src/types';
import { Callable, Command } from '@polkabot/api/src/decorators';
import { PolkabotPluginBase, Room, CommandHandlerOutput, ErrorCode } from '@polkabot/api/src';
import Twitter from 'twitter-lite';

/**
 * This is a convenience to describe the config expected by the plugin.
 * Most of the fields should be available in the config (See confmgr).
 */
export type TwitterConfig = {
  cooldown: number;
  rateWindow: number;
  rateLimit: number;
  consumerKey: string;
  consumerSecret: string;
  tokenKey: string;
  tokenSecret: string;
}

/**
 * Convenience to avoid typos.
 */
enum ConfigKeys {
  COOLDOWN = 'COOLDOWN',
  RATE_WINDOW = 'RATE_WINDOW',
  RATE_LIMIT = 'RATE_LIMIT',
  CONSUMER_KEY = 'CONSUMER_KEY',
  CONSUMER_SECRET = 'CONSUMER_SECRET',
  TOKEN_KEY = 'TOKEN_KEY',
  TOKEN_SECRET = 'TOKEN_SECRET',
}

@Callable({ alias: 'tw' })
export default class TwitterNotifier extends PolkabotNotifier {
  private static readonly MODULE = 'NOTIFIER_TWITTER';
  private config: TwitterConfig;
  public channel = 'twitter';
  private tweetTimestamps: Date[] = []
  private twitterClient: Twitter;


  public constructor(module: PluginModule, context: PluginContext, config?) {
    super(module, context, config);

    // Calling this method in the ctor is mandatory
    PolkabotPluginBase.bindCommands(this);

    this.config = {
      cooldown: this.context.config.Get(TwitterNotifier.MODULE, ConfigKeys.COOLDOWN),
      rateWindow: this.context.config.Get(TwitterNotifier.MODULE, ConfigKeys.RATE_WINDOW),
      rateLimit: this.context.config.Get(TwitterNotifier.MODULE, ConfigKeys.RATE_LIMIT),

      consumerKey: this.context.config.Get(TwitterNotifier.MODULE, ConfigKeys.CONSUMER_KEY),
      consumerSecret: this.context.config.Get(TwitterNotifier.MODULE, ConfigKeys.CONSUMER_SECRET),
      tokenKey: this.context.config.Get(TwitterNotifier.MODULE, ConfigKeys.TOKEN_KEY),
      tokenSecret: this.context.config.Get(TwitterNotifier.MODULE, ConfigKeys.TOKEN_SECRET),
    };

    this.twitterClient = new Twitter({
      'consumer_key': this.config.consumerKey,
      'consumer_secret': this.config.consumerSecret,
      'access_token_key': this.config.tokenKey,
      'access_token_secret': this.config.tokenSecret,
    });
  }

  private async tweet(status: string): Promise<void> {
    this.context.logger.info('🐦 Sending tweet');
    if (status.length > 250)
      this.context.logger.warn(`Tweets are limited to 280 chars, you are sending ${status.length}`);

    const tweet = await this.twitterClient.post('statuses/update', {
      status,
      // auto_populate_reply_metadata: true
    });
    this.context.logger.info(`tweetId: ${tweet.id_str}`);
  }

  @Command({ description: 'Send a tweet, subject to cooldown and rate limits' })
  public cmdSay(_event, room: Room, args: string[]): CommandHandlerOutput {
    this.context.logger.debug('Got request to tweet: %o', args);
    if (this.canTweet()) {
      this.logTweet();
      const msg = args.join(' ');

      this.tweet(msg).then(_ => {
        return PolkabotPluginBase.generateSingleAnswer('OK tweet sent', room);
      }).catch(e => {
        this.context.logger.error('%o', e);
        return PolkabotPluginBase.generateSingleAnswer('ERROR sending tweet', room);
      });
    } else {
      this.context.logger.warn('🐦 Tweet NOT sent, limited by cooldown/rate limits');
      return PolkabotPluginBase.generateSingleAnswer('WARNING tweet NOT sent', room);
    }

    return { logMsg: '', code: ErrorCode.GenericError };
  }

  private logTweet(): void {
    const d = new Date();
    this.tweetTimestamps.push(d);
    this.tweetTimestamps = this.getTweetsForWindow(this.config.rateWindow);
    this.context.logger.debug(`Number of tweets sent during the last window: ${this.tweetTimestamps.length}`);
  }

  private getTweetsForWindow(ms: number): Date[] {
    const startDate = new Date(Date.now() - ms);
    return this.tweetTimestamps.filter((tmsp: Date) => tmsp >= startDate);
  }

  private getLastTweetDate(): Date {
    return this.tweetTimestamps.slice(-1)[0];
  }

  /**
 * This function tells us whether we are allowed to tweet according 
 * to cooldown, rate limits, etc..
 */
  private canTweet(): boolean {
    const lastTweet = this.getLastTweetDate();
    this.context.logger.debug(`last tweet: ${new Date(lastTweet)}`);
    if (!lastTweet) return true;
    const cooldownTest = Date.now() - lastTweet.getTime() >= this.config.cooldown;
    const rateWindowTest = this.getTweetsForWindow(this.config.rateWindow).length < this.config.rateLimit;
    this.context.logger.debug(`cooldownTest=${cooldownTest} rateWindowTest=${rateWindowTest}`);
    return cooldownTest && rateWindowTest;
  }

  public notify(message: NotifierMessage, specs: NotifierSpecs): void {
    if (this.canTweet()) {
      this.logTweet();
      super.notify(message, specs);

      this.tweet(message.message).then(_ => {
        this.context.logger.debug('Tweet sent');
      }).catch(e => {
        this.context.logger.error('%o', e);
      });
    } else {
      this.context.logger.warn(`🐦 We are not allowed to tweet atm, that would exceed our rates/cooldown. Last tweet: ${(Date.now() - this.getLastTweetDate().getTime()) / 1000}s ago`);
    }
  }
}
