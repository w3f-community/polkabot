import { PolkabotPluginBase } from './PolkabotPluginBase';
import { PluginModule, PluginContext, PluginType } from './types';

export abstract class PolkabotWorker extends PolkabotPluginBase {  
  constructor(mod: PluginModule, context: PluginContext, config?) {
    super(PluginType.Worker, mod, context, config);
  }
  
  public abstract start();
  public abstract stop();
}
