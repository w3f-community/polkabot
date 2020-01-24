// import 'babel-core/register'
// import 'babel-polyfill'
import Olm from "olm";
import minimongo from "minimongo";
import { ApiPromise, WsProvider } from "@polkadot/api";
import Datastore from "nedb";

import pkg from "../package.json";
import PluginScanner from "./lib/plugin-scanner";
// import PluginLoader from "./lib/plugin-loader"; // TODO wk bring that back
// import * as path from 'path'
import sdk from "matrix-js-sdk";
import { ConfigSingleton } from "./ConfigSingleton";
import { assert } from "@polkadot/util";
import { IPolkabotConfig } from "./types";
import PluginLoader from "./lib/plugin-loader";
import {
  PluginContext,
  PolkabotPlugin,
  PolkabotWorker,
  PolkabotNotifier,
  NotifierMessage,
  NotifierSpecs,
  PluginModule
} from "../../polkabot-api/src/plugin.interface";

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

  public constructor(args) {
    // this.args = args
    this.db = new Datastore({ filename: "polkabot.db" });
  }

  private isWorker(candidate: PolkabotPlugin): candidate is PolkabotWorker {
    if ((candidate as PolkabotWorker).start) {
      return true;
    }
    return false;
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

  private async loadPlugins() {
    console.log("Polkabot - Loading plugins:");
    const pluginScanner = new PluginScanner(pkg.name + "-plugin");
    let plugins = await pluginScanner.scan(); // TODO: switch back to a const

    // TODO remove that, here we ignore some plugins on purpose
    plugins = plugins.filter(
      (p: PluginModule) => p.name.indexOf("day") > 0 || p.name.indexOf("matrix") > 0 || p.name.indexOf("twitter") > 0
    );
    console.log(`Found ${plugins.length} plugins`);
    // console.log(`${JSON.stringify(plugins, null, 2)}`);

    plugins.map(plugin => {
      const context: PluginContext = {
        config: this.config,
        pkg,
        db: this.db,
        matrix: this.matrix,
        polkadot: this.polkadot,
        polkabot: this
      };

      PluginLoader.load(plugin, context)
        .then(p => {
          if (this.isWorker(p)) {
            console.log(`Starting worker plugin ${p.package.name} v${p.package.version}`);
            p.start();
          } else {
            console.log(`Registering non-worker plugin ${p.package.name} v${p.package.version}`);

            // todo that will become a switch case
            this.registerNotifier(p);
          }
        })
        .catch(e => console.log(e));
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

    this.loadPlugins();
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
