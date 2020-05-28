import { CommandDecoratorArgs, PluginCommand, CommandDictionary } from '../types';
import LoggerSingleton from '@polkabot/api/src/LoggerFactory';
import { assert } from '../utils';
import { PolkabotChatbot } from '..';

const Logger = LoggerSingleton.getInstance();

/**
 * Define the name of a command given the name of the function the decorator
 * is applied to or set defaults.
 * For instance, if the function is named cmdStatus, the command will be 'status'.
 */
function getCommandName(functionName: string, args?: CommandDecoratorArgs): string {
  return args && args.name ? args.name : functionName.toLowerCase().replace('cmd', '');
}

/**
 * Get the right command in a [[CommandDictionnary]] given a message ([[msg]])
 * @param commands Command dictionnary
 * @param msg The message provided by the user
 */
function getCommand(commands: CommandDictionary, msg: string): PluginCommand {
  const botCommand = PolkabotChatbot.getBotCommand(msg);
  return commands[botCommand.command];
}

/**
 * This method decorator signals that the function it is applied to
 * is a command handler. This function will run to answer a command
 * given by the user.
 * @param cmd 
 */
export function Command(decoargs?: CommandDecoratorArgs): Function {
  return function (target: any, methodName: string, _descriptor: PropertyDescriptor) {
    const cls = target.constructor;

    if (!cls.commands) cls.commands = {};
    assert(cls.name !== 'Function', 'There is a problem here. Did you use a static method? You should not!');

    Logger.silly(`@Command on ${cls.name}:${methodName}`);
    const cmd: PluginCommand = {
      name: getCommandName(methodName, decoargs),
      description: decoargs ? decoargs.description : 'Missing description',
      argsRegexp: decoargs ? decoargs.argsRegexp : null,
      adminOnly: decoargs && decoargs.adminOnly !== undefined ? decoargs.adminOnly : true,
      handler: target[methodName]
    };

    Logger.silly(`Adding command ${cmd.name} to commands`);
    cls.commands[cmd.name] = cmd;
    cls.getCommand = getCommand;
    cls.getCommands = () => {
      const res = [];
      Object.keys(cls.commands).map((key: string) => {
        const cmd = cls.commands[key];
        res.push(cmd);
      });
      return res;
    };
  };
}
