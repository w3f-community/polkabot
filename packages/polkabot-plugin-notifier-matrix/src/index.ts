import { PolkabotNotifier } from '../../polkabot-api/src/PolkabotNotifier';
import { PluginModule, PluginContext, NotifierMessage, NotifierSpecs, CommandHandlerOutput, Room, Controllable } from '../../polkabot-api/src/types';
import { Command, Callable } from '@polkabot/api/src/decorators';
import { assert, PolkabotPluginBase } from '@polkabot/api/src';

@Callable({ alias: 'matrix' })
export default class MatrixNotifier extends PolkabotNotifier {
  public channel = 'matrix';
  public constructor(mod: PluginModule, context: PluginContext, config?) {
    super(mod, context, config);
    this.context.logger.silly('++MatrixNotifier', this);

    const commands = (MatrixNotifier as unknown as Controllable).commands;
    assert(typeof commands !== 'undefined', 'Commands were not set');
    assert(Object.values(commands).length > 0, 'commands contains no command!');
    //this.context.logger.silly('MatrixNotifier: %o', MatrixNotifier); // OK
    //this.context.logger.silly('commands: %o', commands); // OK

    PolkabotPluginBase.bindCommands(this);
  }

  public notify(message: NotifierMessage, specs: NotifierSpecs): void {
    super.notify(message, specs);
    const roomId = this.context.config.Get('MATRIX', 'ROOM_ID');
    this.context.logger.info('🌐 Notifier/matrix:', message, specs);

    this.context.matrix.sendTextMessage(roomId, message.message).finally(null);
  }

  @Command({ description: 'Send a message as if the bot did' })
  public cmdSay(_event, room: Room, messages: string[]): CommandHandlerOutput {
    this.context.logger.debug('MatrixNotifier.cmdSay()');

    const roomId = this.context.config.Get('MATRIX', 'ROOM_ID');

    // Send the message to the public room
    this.context.matrix.sendTextMessage(roomId, messages.join(' '));

    // return the result that will show up in the logs and operator room
    return PolkabotPluginBase.generateSingleAnswer(messages.join(' '), room);
  }
}
