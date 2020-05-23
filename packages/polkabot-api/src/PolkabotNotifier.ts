import { PolkabotPluginBase } from './PolkabotPluginBase';
import { PluginModule, PluginContext, NotifierMessage, NotifierSpecs, PluginType } from './types';

export abstract class PolkabotNotifier extends PolkabotPluginBase {
  public abstract channel: string; // 'twitter', 'matrix', 'email', ....
  
  constructor(mod: PluginModule, context: PluginContext, config?) {
    super(PluginType.Notifier, mod, context, config);
  }
  public notify(_message: NotifierMessage, _specs: NotifierSpecs): void {
    // console.log("Notifier - notify()", message, specs);
  }
}
