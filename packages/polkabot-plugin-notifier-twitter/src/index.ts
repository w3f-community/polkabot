import {
  PolkabotNotifier,
  NotifierMessage,
  NotifierSpecs,
  PluginModule,
  PluginContext
} from "../../polkabot-api/src/plugin.interface";

// TODO: we want that to extends PolkabotPlugin
export default class TwitterNotifier extends PolkabotNotifier {
  public channel: string = "twitter";

  public constructor(module: PluginModule, context: PluginContext, config?) {
    super(module, context, config);
  }

  public notify(message: NotifierMessage, specs: NotifierSpecs): void {
    super.notify(message, specs);
  }
}
