import {
  NotifierMessage,
  NotifierSpecs,
  PluginModule,
  PluginContext
} from '../../polkabot-api/src/plugin.interface';
import { PolkabotNotifier } from '../../polkabot-api/src/PolkabotNotifier';

// TODO: we want that to extends PolkabotPlugin
export default class TwitterNotifier extends PolkabotNotifier {
  public channel = 'twitter';

  public constructor(module: PluginModule, context: PluginContext, config?) {
    super(module, context, config);
  }

  public notify(message: NotifierMessage, specs: NotifierSpecs): void {
    super.notify(message, specs);
    console.log('🐦 Notifier/twitter: Placeholder - This is where the tweet will be sent');
  }
}
