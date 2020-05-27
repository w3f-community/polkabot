import { CallableMeta, CommandDecoratorArgs, PluginCommand, ControllableMeta } from './types';
import LoggerSingleton from '@polkabot/api/src/LoggerFactory';
import { PolkabotChatbot, CommandDictionary } from '.';
import { assert } from './utils';

const Logger = LoggerSingleton.getInstance();

/**
 * This class decorator signals a class that will be callable from the 
 * chat. It dynamically sets up a few of the members and helpers required
 * by a Controllable.
 * @param args 
 */
export function Callable(args?: CallableMeta): Function {
  // Note we cannot use context yet
  return (target: any) => {
    Logger.silly(`DECORATOR Callable on ${(target as unknown as Function).name}`);
    const meta: ControllableMeta = {
      name: args && args.name ? args.name : (target as any).name,
      alias: args && args.alias ? args.alias : (target as any).name.toLowerCase()
    };

    // Implement Controllable
    // We keep the following so that we have it initialized even if the user 
    // did not use @Command yet.
    if (typeof target.commands === 'undefined') target.commands = {};

    //Logger.silly('target= %o', target);
    // Logger.silly('Commands are %o', target.constructor.commands);
    const commandCount = Object.keys(target.commands).length;
    assert(commandCount > 0, 'A Callable without command does not sound good!');
    target.meta = meta;
    target.isControllable = commandCount > 0;
  };
}

/**
 * This type describes the arguments expected by the [[Configured | Configured decorator]]. 
 */
export type ConfiguredDecoratorArgs = {
  /** Defaults to POLKABOT */
  application?: string;
  /** Optional, this is the name of the MODULE as found in the config specs. If omited, the uppercased name of the class is used. */
  module?: string;
  /** Mandatory, this is the list of keys we expect in the config */
  keys: string[];
}

export interface Configured {
  configKeys: string[];
  configModule: string;
  configApplication: string;
  getKeys(): string[];
  getValue<T>(key: string, module?: string, application?: string): T;
}

/**
 * This class decorator simplifies how we can make config values available. 
 * We pass the list of config params and they will be made available as list and getters.
 * @param params The list of config params
 */
export function Configured(params: ConfiguredDecoratorArgs): Function {
  return (target: Configured) => {
    Logger.debug('DECORATOR CONFIGURED');
    target.configApplication = params.application ? params.application : 'POLKABOT';
    target.configModule = params.module ? params.module : (target as any).name.toUpperCase();

    if (!target.configKeys) target.configKeys = params.keys;

    target.getKeys = (): string[] => {
      return target.configKeys;
    };

    target.getValue = function <T>(key: string): T {
      Logger.debug(`Get key for ${target.configApplication}_${target.configModule}_${key}`);
      return 42 as unknown as T;
      // return 
      // [key]
    };
  };
}

/**
 * Define the name of a command given the name of the function the decorator
 * is applied to or set defaults.
 * For instance, if the function is named cmdStatus, the command will be 'status'.
 */
function getCommandName(functionName: string, args?: CommandDecoratorArgs): string {
  return args && args.name ? args.name : functionName.toLowerCase().replace('cmd', '');
}

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
    
    if (!cls.commands) cls.commands = { };
    
    // if (typeof cls === 'function') cls = cls()
    assert(cls.name !== 'Function', 'There is a problem here. Did you use a static method? You should not!');

    // Logger.info('Command, target %o',target)
    // Logger.info('Command, cls: %o', cls)
    
    Logger.silly(`DECORATOR Command on ${cls.name}:${methodName}`);
    const cmd: PluginCommand = {
      name: getCommandName(methodName, decoargs),
      description: decoargs ? decoargs.description : 'Missing description',
      argsRegexp: decoargs ? decoargs.argsRegexp : null,
      adminOnly: decoargs && decoargs.adminOnly !== undefined ? decoargs.adminOnly : true,
      handler: target[methodName]
    };
    // if (typeof cls.commands == 'undefined') cls.commands = {};
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
