import type Room from 'matrix-js-sdk';
import type MatrixClient from 'matrix-js-sdk';
import type RoomMember from 'matrix-js-sdk';
import type Event from 'matrix-js-sdk';
export { Room, MatrixClient, Event, RoomMember };

import { PolkabotWorker } from './PolkabotWorker';
import { PolkabotNotifier } from './PolkabotNotifier';
import { PolkabotChatbot } from './PolkabotChatbot';
import { winston } from './LoggerFactory';
import { packageJson } from 'package-json';
import { ConfigObject } from 'confmgr';
import { PolkabotPluginBase } from '.';
export { winston };

export interface PolkabotInterface {
  notify(message: NotifierMessage, specs: NotifierSpecs): void;
}

export type Cache = {
  [Key: string]: unknown;
}

export type CallableMeta = {
  name?: string;
  alias?: string;
}

export type ControllableMeta = {
  name: string;
  alias: string;
}

export type MatrixEventType = 'm.room.encrypted' | 'm.room.message'

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

/**
 * Polkabot recognizes thos 3 types of plugins.
 */
export enum PluginType {
  Worker,
  Notifier,
  Chatbot
}

/**
 * This is a hash of all the subscriptions.
 * If the user keeps on using this, there will be nothing for them to do to unsubscribe.
 */
export interface UnsubDictionnary {
  [key: string]: Function;
}


export type RoomAnswer = {
  room: Room;
  message: string;
  html?: boolean; // If we don't pass HTML it is assumed that it is
};

/**
 * Some error code
 */
export enum ErrorCode {
  /** Some error occured */
  GenericError = -1,
  Ok = 0
}

export type CommandHandlerOutput = {
  /** This error code will show up in the logs */
  code: ErrorCode;
  /** This is a message mainly used in the logs */
  logMsg: string;
  /** Those are answers directed to the room where the request came from*/
  answers?: RoomAnswer[];
};

export type RoomId = string;
export type Message = string;
export type SenderId = string;

export type PluginCommand = {
  name: string; // ie: start
  description: string; // what does this command do
  argsRegexp: string; // regexp to validate the expected args
  adminOnly: boolean; // is the command only for admins ?
  handler: (plugin: PolkabotPluginBase, ...args: unknown[]) => CommandHandlerOutput;
};

export type CommandDecoratorArgs = {
  name?: string;
  description?: string; // what does this command do
  argsRegexp?: string; // regexp to validate the expected args
  adminOnly?: boolean; // is the command only for admins ?
}

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
 * Something implementing this interface must expose a function that helps
 * fetching an object describing all the commands and handlers that can
 * be called to control the thing.
 */
export interface Controllable extends Function {
  commands: CommandDictionary;
  meta: ControllableMeta;
  isControllable: boolean;
  getCommand(commands: PluginCommand[], cmd: string): PluginCommand | null;
  getCommands(): PluginCommand[];
}

/**
 * Some of our plugins may expose some commands to be controlled from outside.
 * Those commands will be executed thanks to handlers.
 * This type describes a handler dictionnary where
 * the command (key) is mapped to the handler function.
 */
export type CommandDictionary = {
  [key: string]: PluginCommand;
}

/**
 * A ChatBot must have controllables to send commands to.
 */
export interface ChatBot {
  controllables: Controllable[];
}

/**
 * A BotCommand consists in a module, a command and some optionnal arguments.
 * For instance: `!op add 1 2` where `op` is the module, `add` is the command
 * and `1 2` are the 2 arguments.
 */
export type BotCommand = {
  module: string; // op, id, bday, etc...
  command: string; // status, help, etc, ...
  args?: string[];
};

/**
 * Polkabot knows 3 types of plugins:
 * - PolkabotWorker
 * - PolkabotNotifier
 * - PolkabotChatbot
 */
export type PolkabotPlugin = PolkabotWorker | PolkabotNotifier | PolkabotChatbot;

/**
 * This is the context Polkabot passes to any plugin
 */
export interface PluginContext {
  config: ConfigObject;
  pkg: packageJson;
  db;
  matrix: MatrixClient;
  logger: winston.Logger;
  polkadot;
  polkabot: PolkabotInterface;
}

/**
 * Without surprise, the most basic message we can have 
 * is a single string.
 */
export type BasicMessage = {
  message: string;
}

/**
 * This is the type of message an email notifier would handle.
 * NOTE: There is currently no such notifier.
 */
export type NotifierMessageEmail = BasicMessage & {
  subject: string;
  email: string;
};

/**
 * This is a message as we send it to the Twitter notifier.
 */
export type NotifierMessageTwitter = BasicMessage;

//TODO: fix that one, it should be text | html + text
/**
 * This is a message as we send it to the Matrix notifier.
 */
export type NotifierMessageMatrix = BasicMessage;

/**
 * This is the list of messages currently supported by Polkabot
 */
export type NotifierMessage =
  | NotifierMessageMatrix
  | NotifierMessageTwitter
//| NotifierMessageEmail;

/**
 * When a plugin wants to send a notification, it needs to include a
 * NotifierSpecs object that is describing what notifier(s) should be targeted.
 * In other worlds, this is where a plugin says "now send 'hello world' on _twitter and matrix_"
 */
export type NotifierSpecs = {
  notifiers: string[] | string;
};

export enum Severity {
  INFO,
  WARNING,
  IMPORTANT,
  CRITICAL,
}

export type Announcement = {
  severity: Severity;
  message: string;
};

export type BlockMoment = {
  future: boolean; // is the block in the future
  duration: number; // in/for how many seconds
  date: Date; // what is the estimated date
  message: string; // formated date string that will be removed
};
