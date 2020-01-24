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
}

export class PolkabotPluginBase {
  public module: PluginModule;
  public config: any; // TODO
  public context: any; // TODO
  public package: packageJson;
  public type: Type;

  constructor(type:Type, mod: PluginModule, context: PluginContext, config?) {
    // console.log(`++ PolkabotPluginBase/${type} ${mod.name}: ${mod.path}`);
    this.type = type
    this.context = context;
    this.config = config;
    this.module = mod;
    const packageFile = path.join(mod.path, "package.json");

    // console.log("loading package from", packageFile);
    this.package = require(packageFile);

    assert(this.package, "package not loaded properly");
  }
}

// export interface IPolkabotWorker implements PolkabotPluginBase {
//   start(): void;
// }

export abstract class PolkabotWorker extends PolkabotPluginBase {
  constructor(mod: PluginModule,  context: PluginContext, config?) {
    super(Type.Worker, mod, context, config)
  }
  public abstract start()
}

export abstract class PolkabotNotifier extends PolkabotPluginBase {
  public abstract channel: string; // 'twitter', 'matrix', 'email', ....

  constructor(mod: PluginModule,  context: PluginContext, config?) {
    super(Type.Notifier, mod, context, config)
  }

  public notify(message: NotifierMessage, specs: NotifierSpecs): void {
    console.log("MatrixNotifier - notify()", message, specs);
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
