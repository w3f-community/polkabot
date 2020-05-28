import { PolkabotPluginBase } from './PolkabotPluginBase';
import { PluginModule, PluginContext, PluginType, UnsubDictionnary } from './types';

export abstract class PolkabotWorker extends PolkabotPluginBase {
  protected unsubs: UnsubDictionnary = {};
  protected started: boolean = false;

  constructor(mod: PluginModule, context: PluginContext, config?) {
    super(PluginType.Worker, mod, context, config);
  }

  public start() {
    this.started = true;
  }

  public stop() {
    this.context.logger.debug('STOPPING');

    Object.keys(this.unsubs).map(unsub => {
      const fn = this.unsubs[unsub];
      this.context.logger.debug(`Running unsub for ${unsub}`);
      if (fn) fn();
    });
    this.started=false;
  }
}
