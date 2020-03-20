import { packageJson } from 'package-json';
import * as path from 'path';
import { assert } from './utils';
import { PolkabotWorker } from './PolkabotWorker';
import { PolkabotChatbot } from './PolkabotChatbot';
import { PolkabotNotifier } from './PolkabotNotifier';
import { ConfigObject } from 'confmgr';

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

export type RoomAnswer = {
  room: Room;
  message: string;
  html?: boolean; // If we don't pass HTML it is assumed that it is
};

export type CommandHandlerOutput = {
  code: number;
  msg: string;
  answers?: RoomAnswer[];
};

export type RoomId = string;
export type Message = string;
export type SenderId = string;

export type Room = {
  name: string;
  roomId: RoomId;
  currentState: {
    members: Member[];
  };
};

export type Member = any;

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
export interface Controllable {
  commandSet?: PluginCommandSet;
}

export interface ChatBot {
  controllables: Controllable[];
}

export class PolkabotPluginBase {
  // TODO: fix the mess here
  public module: PluginModule;
  public config: ConfigObject;
  public context: PluginContext; // TODO
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
    const packageFile = path.join(mod.path, 'package.json');

    // console.log("loading package from", packageFile);
    this.package = require(packageFile);

    assert(this.package, 'package not loaded properly');
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

export type PolkabotPlugin = PolkabotWorker | PolkabotNotifier | PolkabotChatbot;

/**
 * This is the context Polkabot passes to any plugin
 */
export interface PluginContext {
  config: ConfigObject;
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
