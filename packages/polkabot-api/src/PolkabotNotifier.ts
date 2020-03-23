import { PolkabotPluginBase, PluginModule, PluginContext, Type, NotifierMessage, NotifierSpecs } from './plugin.interface';

export abstract class PolkabotNotifier extends PolkabotPluginBase {
  public abstract channel: string; // 'twitter', 'matrix', 'email', ....
  
  constructor(mod: PluginModule, context: PluginContext, config?) {
    super(Type.Notifier, mod, context, config);
  }
  public notify(_message: NotifierMessage, _specs: NotifierSpecs): void {
    // console.log("Notifier - notify()", message, specs);
  }
}
