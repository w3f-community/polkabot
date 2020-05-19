import LoggerSingleton from '../../polkabot-api/src/logger';
import { CallableMetas } from './types';
import { CommandDecoratorArgs, PluginCommand } from './plugin.interface';

const Logger = LoggerSingleton.getInstance();

/**
 * This class decorator signals a class that will be callable from the 
 * chat.
 * @param args 
 */
export function Callable(args?: CallableMetas): Function {
  // Note we cannot use context yet
  return (target: any) => {
    Logger.silly('target: %o', target)
    const meta: CallableMetas = {
      name: args && args.name ? args.name : target.name,
      alias: args && args.alias ? args.alias : target.name.toLowerCase()
    };

    target.meta = meta;
  };
}

/**
 * This class decorator simplifies how we can make config
 * values available. We pass the list of config params and
 * they will be made available.
 * @param params The list of config params
 */
export function Configured(params: string[]): Function {
  Logger.silly('Configured: ' + params.join(' '));

  return (_ctor: Function) => {
    Logger.silly('Configured: ' + params.join(' '));
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
