import { PolkabotPluginBase, PluginModule, PluginContext, Type } from "./plugin.interface";

export abstract class PolkabotWorker extends PolkabotPluginBase {
  constructor(mod: PluginModule, context: PluginContext, config?) {
    super(Type.Worker, mod, context, config);
  }
  public abstract start();
  public abstract stop();
}
