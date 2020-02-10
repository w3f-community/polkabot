import { packageJson } from "package-json";
import * as path from "path";
import { assert } from "./utils";


/**
 * A plugin module before the package has been loaded.
 * Before loading the patch we know only the path and the name
 * of the package.
 */
export type PluginModule = {
  name: string; // polkabot-plugin-foobar
  shortName: string; // foobar
  path: string; // /some/path/to/module
};

export enum Type {
  Worker,
  Notifier,
  Chatbot
}

export type CommandHandlerOutput = {
  code: number;
  msg: string;
};

export type PluginCommand = {
  name: string; // ie: start
  description: string; // what does this command do
  argsRegexp: string; // regexp to validate the expected args
  adminOnly: boolean; // is the command only for admins ?
  handler: (...args: any[]) => CommandHandlerOutput;
};

export type PluginCommandSet = {
  name: string; // ie: Identity Registrar
  alias: string; // ie: reg
  commands: Array<PluginCommand>;
};

// export interface IPolkabotPlugin {
//   start(): void;
//   stop(): void;
// }

/**
 * Something implementing IControllable must expose commands and handlers that can
 * be called to control the thing.
 */
export interface IControllable {
  commandSet?: PluginCommandSet;
}

export interface IChatBot {
  controllables: IControllable[];
}

export class PolkabotPluginBase {
  public module: PluginModule;
  public config: any; // TODO
  public context: any; // TODO
  public package: packageJson;
  public type: Type;
  public commandSet?: PluginCommandSet;

  // public description: string; // some blabla about the plugin, we dont have this field, we use the package.json/description

  constructor(type: Type, mod: PluginModule, context: PluginContext, config?) {
    // console.log(`++ PolkabotPluginBase/${type} ${mod.name}: ${mod.path}`);
    this.type = type;
    this.context = context;
    this.config = config;
    this.module = mod;
    const packageFile = path.join(mod.path, "package.json");

    // console.log("loading package from", packageFile);
    this.package = require(packageFile);

    assert(this.package, "package not loaded properly");
  }

  // toString() {
  //   const obj = this;
  //   delete obj.context;
  //   return JSON.stringify(obj, null, 2);
  // }
}

export type BotCommand = {
  module: string; // op, id, bday, etc...
  command: string; // status, help, etc, ...
  args?: string[];
};

// TODO: get this class out!
export abstract class PolkabotWorker extends PolkabotPluginBase {
  constructor(mod: PluginModule, context: PluginContext, config?) {
    super(Type.Worker, mod, context, config);
  }
  public abstract start();
  public abstract stop();
}

export abstract class PolkabotChatbot extends PolkabotPluginBase implements IChatBot {
  controllables: IControllable[] = [];

  constructor(mod: PluginModule, context: PluginContext, config?) {
    super(Type.Chatbot, mod, context, config);
  }

  public registerControllables(controllables: IControllable[]) {
    console.log(`Registering controllables: `);
    // console.log(`controllables: ${JSON.stringify(controllables, null, 2)}`);

    controllables.map((ctrl: PolkabotPluginBase) => {
      console.log(` >> ${ctrl.commandSet.name} (!${ctrl.commandSet.alias})`);
      const commandObject: PluginCommandSet = (ctrl as IControllable).commandSet;
      const commands: PluginCommand[] = commandObject.commands;
      console.log(commands.map(c => c.name));
    });
    this.controllables = controllables
  }

  public abstract start();
  // TODO add stop()

  /**
   * Check that the room id where the sender of the message
   * sent the message from is the same as the room id where
   * that the bot is in.
   */
  protected isPrivate(senderRoomId, roomIdWithBot) {
    return senderRoomId === roomIdWithBot;
  }

   /**
   * Get a string from the chat and extract a BotCommand or none
   * See https://regex101.com/r/1EDFsV/1/tests
   * TODO: That should be a factory creating an instance of a BotCommand class
   * TODO: add unit test for that
   */
  public static getBotCommand(str: string): BotCommand | null {
    let capture = str.match(/^!(?<module>\w+)(\s+(?<command>\w+))(\s+(?<args>.*))?$/i) || [];
    console.log("Operator:getBotCommand() - capture from Bot Master: ", capture);
    if (capture.length > 0 && capture.groups.module && capture.groups.command) {
      const { module, command, args } = capture.groups;
      // const command: string = capture.groups.command;
      const argList: string[] = args === undefined ? null : args.split(" ").map(i => i.replace(" ", "")); // TODO a smarter regexp would do that

      // console.log("Operator - module: ", module);
      // console.log("Operator - command: ", command);
      // console.log("Operator - args: ", args);

      const obj: BotCommand = {
        module,
        command,
        args: argList
      };
      console.log("obj", obj);
      return obj;
    } else {
      console.log("FAILED PARSING COMMAND", str);
      return null;
    }
  }
}

export abstract class PolkabotNotifier extends PolkabotPluginBase {
  public abstract channel: string; // 'twitter', 'matrix', 'email', ....

  constructor(mod: PluginModule, context: PluginContext, config?) {
    super(Type.Notifier, mod, context, config);
  }

  public notify(message: NotifierMessage, specs: NotifierSpecs): void {
    // console.log("Notifier - notify()", message, specs);
  }
}

export type PolkabotPlugin = PolkabotWorker | PolkabotNotifier | PolkabotChatbot;

/**
 * This is the context Polkabot passes to any plugin
 */
export interface PluginContext {
  config;
  pkg;
  db;
  matrix;
  polkadot;
  polkabot;
}

export type NotifierMessageEmail = {
  message: string;
  subject: string;
  email: string;
};

export type NotifierMessageTwitter = {
  message: string;
};

export type NotifierMessageMatrix = {
  message: string;
};

export type NotifierMessage = NotifierMessageMatrix | NotifierMessageTwitter | NotifierMessageEmail;

export type NotifierSpecs = {
  notifiers: string[] | string;
};
