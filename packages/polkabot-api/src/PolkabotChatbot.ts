import { PolkabotPluginBase } from './PolkabotPluginBase';
import LoggerSingleton from './LoggerFactory';
import { ChatBot, Controllable, PluginModule, PluginContext, PluginCommand, RoomAnswer, BotCommand, PluginType } from './types';
import { getClass } from './helpers';

const Logger = LoggerSingleton.getInstance();

export abstract class PolkabotChatbot extends PolkabotPluginBase implements ChatBot {
  controllables: Controllable[] = [];

  constructor(mod: PluginModule, context: PluginContext, config?) {
    super(PluginType.Chatbot, mod, context, config);
  }
  public registerControllables(controllables: Controllable[]): void {
    Logger.debug('Registering controllables: ');

    controllables.map((ctrl: Controllable) => {
      const CtrlClass = getClass(ctrl) as unknown as Controllable;
      // const commandObject: PluginCommandSet = (ctrl as Controllable).commandSet;
      const commands: PluginCommand[] = CtrlClass.commands;
      Logger.debug(` ctrl: ${CtrlClass.metas.name} (!${CtrlClass.metas.alias}) ${commands.map(c => c.name)}`);
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

  /** This function takes a BotCommand and look for a plugin that can handle it.
   * If a plugin is found, its information and handler are returned.
   * If not, null is retuned. In that case it means we are not able to fullfill the request.
   */
  public static matchCommand(controllables: Controllable[], cmd: BotCommand): PluginCommand | null {
    // first we look if the module is known
    const hits = controllables.filter((c: Controllable) => c.metas.alias === cmd.module);

    const controllable = hits.length > 0 ? (hits[0]) : null;
    if (!controllable) return null;

    const handler: PluginCommand = (controllable as Controllable).commands.find(c => c.name === cmd.command);
    return handler;
  }

  // TODO
  /**
   * Search which Controllable plugins can 'do the job' for a given command.
   * @param cmd 
   */
  public static findSupportedModules(_cmd: string): Controllable[] {
    throw new Error('Not implemented');
  }
}
