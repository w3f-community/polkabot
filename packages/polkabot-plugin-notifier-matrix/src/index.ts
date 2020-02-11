import {
  NotifierMessage,
  NotifierSpecs,
  PluginModule,
  PluginContext
} from "../../polkabot-api/src/plugin.interface";
import { PolkabotNotifier } from "../../polkabot-api/src/PolkabotNotifier";

// TODO: we want that to extends PolkabotPlugin
export default class MatrixNotifier extends PolkabotNotifier {
  public channel: string = "matrix";
  public constructor(mod: PluginModule, context: PluginContext, config?) {
    super(mod, context, config);
    // console.log("++MatrixNotifier", this);
  }

  public notify(message: NotifierMessage, specs: NotifierSpecs): void {
    super.notify(message, specs);
    console.log("Notifier/matrix:", message, specs);

    this.context.matrix.sendTextMessage(this.context.config.matrix.roomId, message.message).finally(function() {});
  }
}
