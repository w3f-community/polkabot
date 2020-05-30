import { PolkabotPluginBase } from './PolkabotPluginBase';
import { PluginModule, PluginContext, PluginType, UnsubDictionnary, Room, CommandHandlerOutput } from './types';
import { Command } from './decorators';

export abstract class PolkabotWorker extends PolkabotPluginBase {
  protected unsubs: UnsubDictionnary = {};
  protected started = false;

  constructor(mod: PluginModule, context: PluginContext, config?) {
    super(PluginType.Worker, mod, context, config);
  }

  @Command({ description: 'Start the plugin' })
  public cmdStart(_event, room: Room): CommandHandlerOutput {
    this.start();
    return PolkabotPluginBase.generateSingleAnswer('OK Started', room);
  }

  @Command({ description: 'Stop the plugin' })
  public cmdStop(_event, room: Room): CommandHandlerOutput {
    this.stop();
    return PolkabotPluginBase.generateSingleAnswer('OK Stopped', room);
  }
  
  public start(): void {
    this.started = true;
  }

  public stop(): void {
    this.context.logger.debug('STOPPING');

    Object.keys(this.unsubs).map(unsub => {
      const fn = this.unsubs[unsub];
      this.context.logger.debug(`Running unsub for ${unsub}`);
      if (fn) fn();
    });
    this.started=false;
  }
}
