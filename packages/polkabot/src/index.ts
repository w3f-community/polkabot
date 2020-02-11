import Olm from "olm";
import { ApiPromise, WsProvider } from "@polkadot/api";
import minimongo from "minimongo";
import Datastore from "nedb";

import pkg from "../package.json";
import PluginScanner from "./lib/plugin-scanner";
import PluginLoader from "./lib/plugin-loader";
import sdk from "matrix-js-sdk";
import { ConfigSingleton } from "./ConfigSingleton";
import { IPolkabotConfig } from "./types";
import { assert } from "@polkadot/util";
import {
  PluginContext,
  PolkabotPlugin,
  NotifierMessage,
  NotifierSpecs,
  PluginModule,
  IControllable,
  Type,
} from "../../polkabot-api/src/plugin.interface";
import { PolkabotNotifier } from "../../polkabot-api/src/PolkabotNotifier.js";
import { PolkabotChatbot } from "../../polkabot-api/src/PolkabotChatbot.js";
import { PolkabotWorker } from "../../polkabot-api/src/PolkabotWorker.js";

//@ts-ignore
global.Olm = Olm;

// comment out if you need to trouble shoot matrix issues
// matrix.on('event', function (event) {
//   console.log(event.getType())
// })

export interface INotifiersTable {
  [type: string]: PolkabotNotifier[];
}
export default class Polkabot {
  // private args: any;
  private db: any;
  private config: any;
  private matrix: any;
  private polkadot: any;
  private notifiersTable: INotifiersTable = {};
  private controllablePlugins: IControllable[] = [];
  private chatBots: PolkabotChatbot[] = [];

  public constructor(..._args: any[]) {
    // this.args = args
    this.db = new Datastore({ filename: "polkabot.db" });
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
  public notify(message: NotifierMessage, specs: NotifierSpecs) {
    console.log("Notifier requested", message, specs);

    Object.keys(this.notifiersTable)
      .filter(channel => specs.notifiers.includes(channel))
      .map(channel => {
        this.notifiersTable[channel].map((notifier: PolkabotNotifier) => {
          notifier.notify(message, specs);
        });
      });
  }

  /** This adds a new notifier to those Polkabot is aware of */
  private registerNotifier(notifier: PolkabotNotifier) {
    assert(notifier.channel, "No channel defined");
    const channel = notifier.channel;
    if (!this.notifiersTable[channel]) this.notifiersTable[channel] = [];
    this.notifiersTable[channel].push(notifier);
    // console.log("notifierTable", this.notifiersTable);
  }

  /** Register all the IControllable we find. They will be passed to the Operator. */
  private registerControllable(controllable: IControllable) {
    assert(controllable.commandSet, "No commands defined");
    console.log("Registering controllable:", controllable.commandSet.name);
    this.controllablePlugins.push(controllable);
    // console.log("Controllables", this.controllablePlugins);
  }

  private registerChatbot(bot: PolkabotChatbot) {
    console.log("Registering Chat bot:", bot.module.name);
    this.chatBots.push(bot);
  }

  private async loadPlugins(): Promise<void> {
    return new Promise(async (resolve, _reject) => {
      console.log("Polkabot - Loading plugins: ------------------------");
      const pluginScanner = new PluginScanner(pkg.name + "-plugin");
      let plugins = await pluginScanner.scan(); // TODO: switch back to a const

      console.log("Plugins found (incl. disabled ones):");
      plugins.map(p => {
        console.log(`- ${p.name}`);
      });

      // Here we check the ENV content to see if plugins should be disabled (= not loaded)
      console.log("Filtering out disabled plugins...");
      plugins = plugins.filter((p: PluginModule) => {
        const DISABLED_KEY = `POLKABOT_PLUGIN_${p.shortName}_DISABLED`;
        const disabled: boolean = (process.env[DISABLED_KEY] || "false") === "true";
        console.log(disabled ? "❌" : "✅", p.shortName);

        return !disabled;
      });

      console.log(`Found ${plugins.length} plugins`);

      const loads = [];
      plugins.map(plugin => {
        const context: PluginContext = {
          config: this.config,
          pkg,
          db: this.db,
          matrix: this.matrix,
          polkadot: this.polkadot,
          polkabot: this
        };

        loads.push(
          PluginLoader.load(plugin, context).then((p: PolkabotPlugin) => {
            if (this.isControllable(p)) {
              this.registerControllable(p);
            } else console.log(`▶ NOT Controllable: ${p.package.name}`);

            if (this.isWorker(p)) {
              console.log(`Starting worker plugin ${p.package.name} v${p.package.version}`);
              p.start();
            } //else console.log(`▶ NOT a Worker: ${p.package.name}`);

            if (this.isNotifier(p)) {
              console.log(`Registering notifier plugin ${p.package.name} v${p.package.version}`);
              this.registerNotifier(p);
            } //else console.log(`▶ NOT a Notifier: ${p.package.name}`);

            if (this.isChatBot(p)) {
              console.log(`Registering ChatBot plugin ${p.package.name} v${p.package.version}`);
              this.registerChatbot(p);
            } // else console.log(`▶ NOT a ChatBot: ${p.package.name}`);
          })
        );
      });
      Promise.all(loads).then(_ => {
        console.log("Polkabot - Done loading plugins: ------------------------");
        resolve();
      });
    });
  }

  private attachControllableToBots() {
    console.log("Passing controllables to following bots:");
    this.chatBots.map((bot: PolkabotChatbot) => {
      console.log(` > ${bot.module.name}`);
      bot.registerControllables(this.controllablePlugins);
    });
  }

  private start(_syncState): void {
    // Send message to the room notifying users of the bot's state

    // TODO we don't want to bother users, the following should be removed
    // TODO: if the state is not PREPARED, we could log and error or tell the bot
    // owner as private message.
    //   const messageBody = `Polkadot - sync state with Matrix client is: ${syncState}.`
    //   const sendEventArgs = {
    //     roomId: this.config.matrix.roomId,
    //     eventType: 'm.room.message',
    //     content: {
    //       'body': messageBody,
    //       'msgsype': 'm.text'
    //     },
    //     txnId: ''
    //   }

    //   this.matrix.sendEvent(
    //     sendEventArgs.roomId,
    //     sendEventArgs.eventType,
    //     sendEventArgs.content,
    //     sendEventArgs.txnId, (err, res) => {
    //       if (err) { console.log(err) };
    //     }
    //   )

    this.loadPlugins()
      .then(_ => {
        return this.attachControllableToBots();
      })
      .then(_ => {
        console.log("Done loading plugins");
      });
  }

  public async run() {
    console.log(`${pkg.name} v${pkg.version}`);
    console.log("===========================");

    // const configLocation = this.args.config
    //   ? this.args.config
    //   : path.join(__dirname, './config')
    // console.log('Polkabot - Config location: ', configLocation)

    // this.config = require(configLocation)

    let config: IPolkabotConfig = ConfigSingleton.getInstance();
    assert(config.polkadot.host != null, "Issue with the config");
    assert(config.matrix.botMasterId != null, "Missing bot master id");
    ConfigSingleton.dumpEnv();

    this.config = config;

    // console.log(`Polkabot - config: ${JSON.stringify(this.config, null, 2)}`);
    console.log(`Polkabot - Connecting to host: ${this.config.polkadot.host}`);
    console.log(`Polkabot - Running with bot user id: ${this.config.matrix.botUserId}`);

    const provider = new WsProvider(this.config.polkadot.host);
    // Create the API and wait until ready
    this.polkadot = await ApiPromise.create({ provider });

    // Retrieve the chain & node information information via rpc calls
    const [chain, nodeName, nodeVersion] = await Promise.all([
      this.polkadot.rpc.system.chain(),
      this.polkadot.rpc.system.name(),
      this.polkadot.rpc.system.version()
    ]);

    console.log(`Polkabot - You are connected to chain ${chain} using ${nodeName} v${nodeVersion}`);

    const LocalDb = minimongo.MemoryDb;
    this.db = new LocalDb();
    this.db.addCollection("config");

    this.db.config.upsert({ botMasterId: this.config.matrix.botMasterId }, () => {
      this.db.config.findOne({}, {}, res => {
        console.log("Polkabot - Matrix client bot manager id: " + res.botMasterId);
      });
    });

    // TODO - refactor using async/await. See https://github.com/matrix-org/matrix-js-sdk/issues/789
    console.log("Polkabot - creating client");

    this.matrix = sdk.createClient({
      baseUrl: this.config.matrix.baseUrl,
      accessToken: this.config.matrix.token,
      userId: this.config.matrix.botUserId
    });

    if (this.isCustomBaseUrl()) {
      const data = await this.matrix
        .login("m.login.password", {
          user: this.config.matrix.loginUserId,
          password: this.config.matrix.loginUserPassword
        })
        .catch(error => {
          console.error("Polkabot: Error logging into matrix:", error);
        });

      if (data) {
        console.log("Polkabot - Logged in with credentials: ", data);
      }
    }

    this.matrix.once("sync", (state, _prevState, data) => {
      switch (state) {
        case "PREPARED":
          console.log(`Polkabot - Detected client sync state: ${state}`);
          this.start(state);
          break;
        default:
          console.log("Polkabot - Error. Unable to establish client sync state, state =", state, data);
          process.exit(1);
      }
    });

    // // Event emitted when member's membership changes
    // this.matrix.on('RoomMember.membership', (event, member) => {
    //   if (member.membership === 'invite') {
    //     // TODO: Fix the following to get the latest activity in the room
    //     // const roomState = new sdk.RoomState(member.roomId)
    //     // const inactivityInDays = (new Date() - new Date(roomState._modified)) / 1000 / 60 / 60
    //     // console.log(roomState.events)

    //     // if (inactivityInDays < 7) {
    //     this.matrix.joinRoom(member.roomId).done(() => {
    //       console.log('Polkabot - Auto-joined %s', member.roomId)
    //       console.log(` - ${event.event.membership} from ${event.event.sender}`)
    //       // console.log(` - modified ${new Date(roomState._modified)})`)
    //       // console.log(` - last activity for ${(inactivityInDays / 24).toFixed(3)} days (${(inactivityInDays).toFixed(2)}h)`)
    //     })
    //     // }
    //   }
    // })

    this.matrix.startClient(this.config.matrix.MESSAGES_TO_SHOW || 20);
  }

  private isCustomBaseUrl() {
    const { baseUrl } = this.config.matrix;

    return baseUrl && baseUrl !== "https://matrix.org";
  }
}
