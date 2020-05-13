import Olm from 'olm';
import { ApiPromise, WsProvider } from '@polkadot/api';
import minimongo, { MemoryDb } from 'minimongo';
import Datastore from 'nedb';

import pkg from '../package.json';
import PluginScanner from './lib/plugin-scanner';
import PluginLoader from './lib/plugin-loader';
import sdk from 'matrix-js-sdk';
import { ConfigManager, ConfigObject } from 'confmgr';

import { assert } from '@polkadot/util';
import {
  PluginContext,
  PolkabotPlugin,
  NotifierMessage,
  NotifierSpecs,
  PluginModule,
  Controllable,
  Type,
} from '../../polkabot-api/src/plugin.interface';
import { PolkabotNotifier } from '../../polkabot-api/src/PolkabotNotifier';
import { PolkabotChatbot } from '../../polkabot-api/src/PolkabotChatbot';
import { PolkabotWorker } from '../../polkabot-api/src/PolkabotWorker';
import { MatrixClient } from './types';
import LoggerSingleton, { winston } from '../../polkabot-api/src/logger';

type PolkabotGlobal = {
  Olm: Olm;
};

((global as unknown) as PolkabotGlobal).Olm = Olm;

// comment out if you need to trouble shoot matrix issues
// matrix.on('event', function (event) {
//   Logger.silly(event.getType())
// })

// Here we rewrite the Matrix SDK logger to redirect to our logger
import { logger as mxLogger } from 'matrix-js-sdk/lib/logger';

// rewrite matrix logger
mxLogger.info = (...msg) => Logger.log({ level: 'info', message: msg.join(' '), labels: { label: 'MatrixSDK' } });
mxLogger.log = (...msg) => Logger.log({ level: 'info', message: msg.join(' '), labels: { label: 'MatrixSDK' } });
mxLogger.warn = (...msg) => Logger.log({ level: 'warn', message: msg.join(' '), labels: { label: 'MatrixSDK' } });
mxLogger.error = (...msg) => Logger.log({ level: 'error', message: msg.join(' '), labels: { label: 'MatrixSDK' } });
mxLogger.trace = (...msg) => Logger.log({ level: 'debug', message: msg.join(' '), labels: { label: 'MatrixSDK' } });

export interface NotifiersTable {
  [type: string]: PolkabotNotifier[];
}

const Logger = LoggerSingleton.getInstance()

export default class Polkabot {
  // private args: any;
  private db: minimongo.MemoryDb;
  private config: ConfigObject;
  private matrix: MatrixClient;
  private polkadot: ApiPromise;
  private notifiersTable: NotifiersTable = {};
  private controllablePlugins: Controllable[] = [];
  private chatBots: PolkabotChatbot[] = [];
  private Logger: winston.Logger;

  public constructor(..._args: string[]) {
    // this.args = args
    this.db = new Datastore({ filename: 'polkabot.db' });
  }

  private isWorker(candidate: PolkabotPlugin): candidate is PolkabotWorker {
    return (candidate as PolkabotWorker).start !== undefined;
  }

  private isNotifier(candidate: PolkabotPlugin): candidate is PolkabotNotifier {
    return (candidate as PolkabotNotifier).notify !== undefined;
  }

  private isControllable(candidate: PolkabotPlugin): boolean {
    const res = candidate.commandSet !== undefined;
    // assert(candidate.package.name !== "polkabot-plugin-blocthday" || res, "BUG!");
    return res;
  }

  private isChatBot(candidate: PolkabotPlugin): candidate is PolkabotChatbot {
    return (candidate as PolkabotChatbot).type === Type.Chatbot;
  }

  /** this method is usually called by the workers who wish to notify something
   * polkabot itself does nothing about it. it searches in the list of notifiers which one(s) can do the job and
   * delegate them the task
   */
  public notify(message: NotifierMessage, specs: NotifierSpecs): void {
    Logger.info('Notifier requested', message, specs);

    Object.keys(this.notifiersTable)
      .filter(channel => specs.notifiers.includes(channel))
      .map(channel => {
        this.notifiersTable[channel].map((notifier: PolkabotNotifier) => {
          notifier.notify(message, specs);
        });
      });
  }

  /** This adds a new notifier to those Polkabot is aware of */
  private registerNotifier(notifier: PolkabotNotifier): void {
    assert(notifier.channel, 'No channel defined');
    const channel = notifier.channel;
    if (!this.notifiersTable[channel]) this.notifiersTable[channel] = [];
    this.notifiersTable[channel].push(notifier);
    Logger.silly("notifierTable", this.notifiersTable);
  }

  /** Register all the Controllable we find. They will be passed to the Operator. */
  private registerControllable(controllable: Controllable): void {
    assert(controllable.commandSet, 'No commands defined');
    Logger.info('Registering controllable:', controllable.commandSet.name);
    this.controllablePlugins.push(controllable);
    // Logger.info("Controllables", this.controllablePlugins);
  }

  private registerChatbot(bot: PolkabotChatbot): void {
    Logger.info('Registering Chat bot:', bot.module.name);
    this.chatBots.push(bot);
  }

  private async loadPlugins(): Promise<void> {
    Logger.info('Loading plugins', { meta: { source: 'Polkabot' } })

    const pluginScanner = new PluginScanner(pkg.name + '-plugin');
    let plugins = await pluginScanner.scan();
    return new Promise((resolve, _reject) => {
      Logger.info('Plugins found (incl. disabled ones):');
      plugins.map(p => {
        Logger.info(`- ${p.name}`);
      });

      // Here we check the ENV content to see if plugins should be disabled (= not loaded)
      Logger.debug('Filtering out disabled plugins...');
      plugins = plugins.filter((p: PluginModule) => {
        const DISABLED_KEY = `POLKABOT_${p.shortName}_DISABLED`;
        const disabled: boolean = (process.env[DISABLED_KEY] || 'false') === 'true';
        Logger.debug(`${disabled ? '❌' : '✅'} ${p.shortName}`);

        return !disabled;
      });

      Logger.info(`Found ${plugins.length} plugins`);

      const loads = [];
      plugins.map(plugin => {
        const context: PluginContext = {
          config: this.config,
          pkg,
          db: this.db,
          matrix: this.matrix,
          polkadot: this.polkadot,
          polkabot: this,
        };

        loads.push(
          PluginLoader.load(plugin, context).then((p: PolkabotPlugin) => {
            if (this.isControllable(p)) {
              this.registerControllable(p);
            } else Logger.debug(`▶ NOT Controllable: ${p.package.name}`);

            if (this.isWorker(p)) {
              Logger.debug(`Starting worker plugin ${p.package.name} v${p.package.version}`);
              p.start();
            } //else Logger.debug(`▶ NOT a Worker: ${p.package.name}`);

            if (this.isNotifier(p)) {
              Logger.debug(`Registering notifier plugin ${p.package.name} v${p.package.version}`);
              this.registerNotifier(p);
            } //else Logger.debug(`▶ NOT a Notifier: ${p.package.name}`);

            if (this.isChatBot(p)) {
              Logger.debug(`Registering ChatBot plugin ${p.package.name} v${p.package.version}`);
              this.registerChatbot(p);
            } // else Logger.debug(`▶ NOT a ChatBot: ${p.package.name}`);
          })
        );
      });
      Promise.all(loads).then(_ => {
        Logger.info('Done loading plugins');
        resolve();
      });
    });
  }

  private attachControllableToBots(): void {
    Logger.info('Passing controllables to following bots:');
    this.chatBots.map((bot: PolkabotChatbot) => {
      Logger.info(` > ${bot.module.name}`);
      bot.registerControllables(this.controllablePlugins);
    });
  }

  private start(_syncState): void {
    this.loadPlugins()
      .then(_ => {
        return this.attachControllableToBots();
      })
      .then(_ => {
        Logger.debug('Done loading plugins');
      });
  }

  public async run(): Promise<void> {
    Logger.info(`${pkg.name} v${pkg.version}`);

    // const configLocation = this.args.config
    //   ? this.args.config
    //   : path.join(__dirname, './config')
    // Logger.info('Polkabot - Config location: ', configLocation)

    // this.config = require(configLocation)

    this.config = ConfigManager.getInstance('configSpecs.yml').getConfig();
    this.config.Print({ compact: true, logger: (msg) => Logger.debug(msg) });
    const isConfigValid = this.config.Validate()
    if (!isConfigValid) {
      Logger.error('Config is NOT valid')
      this.config.Print({ compact: true, logger: (msg) => Logger.error(msg) });
      process.exit(1)
      // this.Logger[ isConfigValid ? 'info': 'error'] (`Your config is${ isConfigValid? '' : ' NOT'} valid!`);
    }


    // Logger.info(`Polkabot - config: ${JSON.stringify(this.config, null, 2)}`);
    Logger.info(`Connecting to host: ${this.config.values.POLKADOT.URL}`);
    Logger.silly(`Running with bot user id: ${this.config.values.MATRIX.BOTUSER_ID}`);

    const provider = new WsProvider(this.config.values.POLKADOT.URL);
    // Create the API and wait until ready
    this.polkadot = await ApiPromise.create({ provider });

    // Retrieve the chain & node information information via rpc calls
    const [chain, nodeName, nodeVersion] = await Promise.all([
      this.polkadot.rpc.system.chain(),
      this.polkadot.rpc.system.name(),
      this.polkadot.rpc.system.version(),
    ]);

    Logger.info(`You are connected to chain ${chain} using ${nodeName} v${nodeVersion}`);

    const LocalDb = minimongo.MemoryDb;
    this.db = new LocalDb();
    const ConfigCollection = 'config';
    this.db.addCollection(ConfigCollection);

    this.db[ConfigCollection].upsert({ botMasterId: this.config.values.MATRIX.BOTMASTER_ID }, () => {
      this.db[ConfigCollection].findOne({}, {}, res => {
        Logger.info('Matrix client bot manager id: ' + res.botMasterId);
      });
    });

    Logger.debug('Creating Matrix client');

    this.matrix = sdk.createClient({
      baseUrl: this.config.values.MATRIX.BASE_URL,
      accessToken: this.config.values.MATRIX.TOKEN,
      userId: this.config.values.MATRIX.BOTUSER_ID,
      logger: (msg) => Logger.silly(msg, { labels: { source: 'MatrixSDK' } })
    });

    if (this.isCustomBaseUrl()) {
      const data = await this.matrix
        .login('m.login.password', {
          user: this.config.values.MATRIX.LOGIN_USER_ID,
          password: this.config.values.MATRIX.LOGIN_USER_PASSWORD,
        })
        .catch(error => {
          console.error('Polkabot: Error logging into matrix:', error);
        });

      if (data) {
        Logger.info('Polkabot - Logged in with credentials: ', data);
      }
    }

    this.matrix.once('sync', (state, _prevState, data) => {
      switch (state) {
        case 'PREPARED':
          Logger.info(`Polkabot - Detected client sync state: ${state}`);
          this.start(state);
          break;
        default:
          Logger.info(
            'Polkabot - Error. Unable to establish client sync state, state =',
            state,
            data
          );
          process.exit(1);
      }
    });

    this.matrix.startClient(this.config.values.MATRIX.MESSAGES_TO_SHOW);
  }

  private isCustomBaseUrl(): boolean {
    const baseUrl = this.config.values.MATRIX.BASE_URL;
    return baseUrl && baseUrl !== 'https://matrix.org';
  }
}
