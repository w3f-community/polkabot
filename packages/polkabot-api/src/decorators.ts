import { CallableMeta, CommandDecoratorArgs, PluginCommand, Controllable, ControllableMeta } from './types';
import LoggerSingleton from '@polkabot/api/src/LoggerFactory';

const Logger = LoggerSingleton.getInstance();

/**
 * This class decorator signals a class that will be callable from the 
 * chat. It dynamically sets up a few of the members and helpers required
 * by a Controllable.
 * @param args 
 */
export function Callable(args?: CallableMeta): Function {
  // Note we cannot use context yet
  return (target: Controllable) => {
    Logger.silly(`DECORATOR Callable on ${(target as unknown as Function).name}`);
    const meta: ControllableMeta = {
      name: args && args.name ? args.name : (target as any).name,
      alias: args && args.alias ? args.alias : (target as any).name.toLowerCase()
    };

    // Implement Controllable
    if (!target.commands) target.commands = [];
    target.meta = meta;
    target.isControllable = true;
  };
}

/**
 * This class decorator simplifies how we can make config
 * values available. We pass the list of config params and
 * they will be made available.
 * @param params The list of config params
 */
export function Configured(_params: string[]): Function {
  return (_target: any) => {

    // if (!target.commands) target.commands = [];
    // target.meta = meta;
  };
}

/**
 * This method decorator signals that the function it is applied to
 * is a command handler. This function will run to answer a command
 * given by the user.
 * @param cmd 
 */
export function Command(args?: CommandDecoratorArgs): Function {
  return function (target: any, propertyKey: string, _descriptor: PropertyDescriptor) {
    const cmd: PluginCommand = {
      // TODO: extract a getCommandName()
      name: args && args.name ? args.name : propertyKey.toLowerCase().replace('cmd', ''),
      description: args ? args.description : 'Missing description',
      argsRegexp: args ? args.argsRegexp : null,
      adminOnly: args ? args.adminOnly : true,
      handler: target[propertyKey]
    };
    if (!target.constructor.commands) target.constructor.commands = [];
    target.constructor.commands.push(cmd);
  };
}
