import { PolkabotPluginBase } from './PolkabotPluginBase';
import LoggerSingleton from './LoggerFactory';
import { ChatBot, Controllable, PluginModule, PluginContext, PluginCommand, RoomAnswer, BotCommand, PluginType } from './types';

const Logger = LoggerSingleton.getInstance();

export abstract class PolkabotChatbot extends PolkabotPluginBase implements ChatBot {
  controllables: Controllable[] = [];

  constructor(mod: PluginModule, context: PluginContext, config?) {
    super(PluginType.Chatbot, mod, context, config);
  }
  public registerControllables(controllables: Controllable[]): void {
    Logger.debug('Registering controllables: ');

    controllables.map((ctrl: Controllable) => {
      // const commandObject: PluginCommandSet = (ctrl as Controllable).commandSet;
      const commands: PluginCommand[] = ctrl.getCommandSet().commands;
      Logger.debug(` ctrl: ${ctrl.getCommandSet().name} (!${ctrl.getCommandSet().alias}) ${commands.map(c => c.name)}`);
      // Logger.info(commands.map(c => c.name));
    });
    this.controllables = controllables;
  }

  public abstract start();
  public abstract stop();

  /**
   * Check that the room id where the sender of the message
   * sent the message from is the same as the room id where
   * that the bot is in.
   */
  protected isPrivate(senderRoomId, roomIdWithBot): boolean {
    return senderRoomId === roomIdWithBot;
  }

  public answer(data: RoomAnswer): void {
    const html = data.html || true;
    Logger.silly(`Sending HTML: ${html ? 'TRUE' : 'FALSE'}`);
    if (!html) {
      // Simple text
      this.context.matrix.sendTextMessage(data.room.roomId, data.message);
    }
    else {
      // Html
      this.context.matrix.sendHtmlMessage(data.room.roomId, data.message, data.message);
    }
  }

  /**
   * Get a string from the chat and extract a BotCommand from it or none if there is no match
   * See https://regex101.com/r/1EDFsV/1/tests
   */
  public static getBotCommand(str: string): BotCommand | null {
    const capture = str.match(/^!(?<module>\w+)(\s+(?<command>\w+))(\s+(?<args>.*))?$/i) || [];
    if (capture.length > 0 && capture.groups.module && capture.groups.command) {
      const { module, command, args } = capture.groups;
      const argList: string[] = args === undefined ? null : args.split(' ').map(i => i.replace(' ', ''));
      const obj: BotCommand = {
        module,
        command,
        args: argList
      };
      return obj;
    }
    else {
      Logger.silly('FAILED PARSING COMMAND', str);
      return null;
    }
  }
}
