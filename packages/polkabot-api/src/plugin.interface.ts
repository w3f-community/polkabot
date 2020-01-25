import { packageJson } from "package-json";
import * as path from "path";
import { assert } from "./utils";
/**
 * A plugin module before the package has been loaded.
 * Before loading the patch we know only the path and the name
 * of the package.
 */
export type PluginModule = {
  name: string;
  path: string;
};

export enum Type {
  Worker,
  Notifier,
  Chatbot
}

export class PolkabotPluginBase {
  public module: PluginModule;
  public config: any; // TODO
  public context: any; // TODO
  public package: packageJson;
  public type: Type;

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
}

export abstract class PolkabotWorker extends PolkabotPluginBase {
  constructor(mod: PluginModule, context: PluginContext, config?) {
    super(Type.Worker, mod, context, config);
  }
  public abstract start();
  // TODO add stop()
}

export abstract class PolkabotChatbot extends PolkabotPluginBase {
  constructor(mod: PluginModule, context: PluginContext, config?) {
    super(Type.Chatbot, mod, context, config);
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

export type PolkabotPlugin = PolkabotWorker | PolkabotNotifier;

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
