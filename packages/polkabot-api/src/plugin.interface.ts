
export type PluginModule = {
  name: string;
  path: string;
}

export class PolkabotPluginBase {
  public module: PluginModule;
}

// export interface IPolkabotWorker implements PolkabotPluginBase {
//   start(): void;
// }

export class PolkabotWorker  extends PolkabotPluginBase {
  public start() {}
}

export interface PolkabotNotifier extends PolkabotPluginBase {
  notify(): void;
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
}
