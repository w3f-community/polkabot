import {
  NotifierMessage,
  NotifierSpecs,
  PluginModule,
  PluginContext,
  Room,
  CommandHandlerOutput,
  ErrorCode
} from '../../polkabot-api/src/plugin.interface';
import { PolkabotNotifier } from '../../polkabot-api/src/PolkabotNotifier';
// import getCommandSet from './commandSet';

export default class MatrixNotifier extends PolkabotNotifier {
  public channel = 'matrix';
  public constructor(mod: PluginModule, context: PluginContext, config?) {
    super(mod, context, config);
    // this.context.logger.info("++MatrixNotifier", this);
    
    // TODO: add decorators to bring that back
    // this.commandSet = getCommandSet(this);
  }

  public notify(message: NotifierMessage, specs: NotifierSpecs): void {
    super.notify(message, specs);
    const roomId = this.context.config.Get('MATRIX', 'ROOM_ID');
    this.context.logger.info('🌐 Notifier/matrix:', message, specs);

    this.context.matrix.sendTextMessage(roomId, message.message).finally(null);
  }
  
  public cmdSay(_event, room: Room, messages: string[]): CommandHandlerOutput {
    this.context.logger.debug('MatrixNotifier.cmdSay()');
   
    const roomId = this.context.config.Get('MATRIX', 'ROOM_ID');
    
    this.context.matrix.sendTextMessage(roomId, { message: messages.join(' ') });

    return {
      code: ErrorCode.Ok,
      msg: messages.join(' '),
      answers: [{
        room,
        message: 'Done'
      }]
    };
  }
}
