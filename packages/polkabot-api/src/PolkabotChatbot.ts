import { PolkabotPluginBase } from './PolkabotPluginBase';
import LoggerSingleton from './LoggerFactory';
import { ChatBot, Controllable, PluginModule, PluginContext, PluginCommand, RoomAnswer, BotCommand, PluginType, CommandDictionary } from './types';
import { getClass } from './helpers';

const Logger = LoggerSingleton.getInstance();

export abstract class PolkabotChatbot extends PolkabotPluginBase implements ChatBot {
  controllables: Controllable[] = [];

  constructor(mod: PluginModule, context: PluginContext, config?) {
    super(PluginType.Chatbot, mod, context, config);
  }

  public registerControllables(controllables: Controllable[]): void {
    Logger.info('Registering controllables:');

    controllables.map((ctrl: Controllable) => {
      const CtrlClass = getClass(ctrl) as unknown as Controllable;
      // const commandObject: PluginCommandSet = (ctrl as Controllable).commandSet;
      const commands: CommandDictionary = CtrlClass.commands;
      Logger.info(` ctrl: ${CtrlClass.meta.name} (!${CtrlClass.meta.alias}) ${Object.keys(commands).map(c => commands[c].name)}`);
      // Logger.info(commands.map(c => c.name));
    });
    this.controllables = controllables;
  }

  public abstract start();

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

  /**
  * At runtime, once we need to bind our command handlers with the instance
  * of the controllables. This method, retrieves this instance.
  * We are searching for the controllable that has the right alias and contains the command.
  * @param cmd 
  */
  public static getControllableInstance(controllables: Controllable[], cmd: BotCommand): PolkabotPluginBase {
    return controllables.find(c => {
      if (!c.isControllable){
        Logger.silly('getControllableInstance, %s not controllable ', (c as unknown as PolkabotPluginBase).module.name);
        return false;
      }
      if (c.meta.alias !== cmd.module) {
        Logger.silly('getControllableInstance, %s not matching %s', c.meta.alias, cmd.module);
        return false;
      }
      Logger.silly('Looking for a command matching %s', cmd.command);
      return (c.commands[cmd.command] !== undefined);
    }) as unknown as PolkabotPluginBase;
  }

  /** 
   * This function takes a BotCommand and look for a plugin that can handle it.
   * If a plugin is found, its information and handler are returned.
   * If not, null is retuned. In that case it means we are not able to fullfill the request.
   */
  public static matchCommand(controllables: Controllable[], cmd: BotCommand): PluginCommand | null {
    // first we look if the module is known
    const hits = controllables.filter((c: Controllable) => (getClass(c) as unknown as Controllable).meta.alias === cmd.module);

    const controllable = hits.length > 0 ? (hits[0]) : null;
    if (!controllable) return null;
    const commands = (getClass(controllable) as unknown as Controllable).commands;
    const res: PluginCommand = commands[cmd.command];
    Logger.silly('Found PluginCommand: %o', res);
    // const instance = this.getControllableInstance(controllables, cmd)
    // Logger.silly('Found its instance: %o', controllable)
    // res.handler = res.handler.bind(instance); // This does not seem to work unfortunately, not sure why
    return res;
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
