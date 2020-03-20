import { PolkabotPluginBase, ChatBot, Controllable, PluginModule, PluginContext, Type, PluginCommandSet, PluginCommand, RoomAnswer, BotCommand } from './plugin.interface';

export abstract class PolkabotChatbot extends PolkabotPluginBase implements ChatBot {
  controllables: Controllable[] = [];
  constructor(mod: PluginModule, context: PluginContext, config?) {
    super(Type.Chatbot, mod, context, config);
  }
  public registerControllables(controllables: Controllable[]): void {
    console.log('Registering controllables: ');
    // console.log(`controllables: ${JSON.stringify(controllables, null, 2)}`);
    controllables.map((ctrl: PolkabotPluginBase) => {
      console.log(` >> ${ctrl.commandSet.name} (!${ctrl.commandSet.alias})`);
      const commandObject: PluginCommandSet = (ctrl as Controllable).commandSet;
      const commands: PluginCommand[] = commandObject.commands;
      console.log(commands.map(c => c.name));
    });
    this.controllables = controllables;
  }
  public abstract start();
  // TODO add stop()
  /**
   * Check that the room id where the sender of the message
   * sent the message from is the same as the room id where
   * that the bot is in.
   */
  protected isPrivate(senderRoomId, roomIdWithBot): boolean {
    return senderRoomId === roomIdWithBot;
  }
  // public answer(roomId: RoomId, msg: Message) {
  public answer(data: RoomAnswer): void {
    // console.log("RoomAnswer", data);
    const html = data.html || true;
    console.log(`Sending HTML: ${html ? 'TRUE' : 'FALSE'}`);
    if (!html) {
      // Pure text
      this.context.matrix.sendTextMessage(data.room.roomId, data.message);
    }
    else {
      // Html
      this.context.matrix.sendHtmlMessage(data.room.roomId, data.message, data.message); // TODO: here we cheat sending HTML 2x times... we should have a text version
    }
  }
  /**
   * Get a string from the chat and extract a BotCommand or none
   * See https://regex101.com/r/1EDFsV/1/tests
   * TODO: That should be a factory creating an instance of a BotCommand class
   */
  public static getBotCommand(str: string): BotCommand | null {
    const capture = str.match(/^!(?<module>\w+)(\s+(?<command>\w+))(\s+(?<args>.*))?$/i) || [];
    if (capture.length > 0 && capture.groups.module && capture.groups.command) {
      const { module, command, args } = capture.groups;
      const argList: string[] = args === undefined ? null : args.split(' ').map(i => i.replace(' ', '')); // TODO a smarter regexp would do that
      const obj: BotCommand = {
        module,
        command,
        args: argList
      };
      //   console.log("obj", obj);
      return obj;
    }
    else {
    //   console.log("FAILED PARSING COMMAND", str); // TODO: make this a silly logger message so it does not bother
      return null;
    }
  }
}
