import {
  NotifierMessage,
  NotifierSpecs,
  PluginModule,
  PluginContext
} from '../../polkabot-api/src/plugin.interface';
import { PolkabotNotifier } from '../../polkabot-api/src/PolkabotNotifier';

export default class TwitterNotifier extends PolkabotNotifier {
  public channel = 'twitter';

  public constructor(module: PluginModule, context: PluginContext, config?) {
    super(module, context, config);
  }

  public notify(message: NotifierMessage, specs: NotifierSpecs): void {
    super.notify(message, specs);
    this.context.logger.warn('🐦 Notifier/twitter: Placeholder - This is where the tweet will be sent');
  }
}
