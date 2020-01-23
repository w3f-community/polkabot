import {
  PolkabotNotifier,
  NotifierMessage,
  NotifierSpecs,
  PluginModule,
  PluginContext
} from "../../polkabot-api/src/plugin.interface";

// TODO: we want that to extends PolkabotPlugin
export default class MatrixNotifier extends PolkabotNotifier {
  public constructor(module: PluginModule, context: PluginContext, config?) {
    super(module, context, config);
    console.log("MatrixNotifier: ++");
  }

  public notify(message: NotifierMessage, specs: NotifierSpecs): void {
    super.notify(message, specs);

    this.context.matrix.sendTextMessage(this.context.config.matrix.roomId, message.message).finally(function() {});
  }
}
