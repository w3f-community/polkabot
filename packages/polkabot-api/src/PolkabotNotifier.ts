import { PolkabotPluginBase } from './PolkabotPluginBase';
import { PluginModule, PluginContext, NotifierMessage, NotifierSpecs, PluginType } from './types';

export abstract class PolkabotNotifier extends PolkabotPluginBase {
  public abstract channel: string; // 'twitter', 'matrix', 'email', ....

  constructor(mod: PluginModule, context: PluginContext, config?) {
    super(PluginType.Notifier, mod, context, config);
  }

  /**
   * Implementation of the notification for a given channel
   * @param _message 
   * @param _specs 
   */
  public notify(_message: NotifierMessage, _specs: NotifierSpecs): void {
  }
}
