import LoggerSingleton from '../../polkabot-api/src/logger';
import { PolkabotPluginParams } from './types';
import { CommandDecoratorArgs, PluginCommand } from './plugin.interface';

const Logger = LoggerSingleton.getInstance();

/**
 * This class decorator signals a class that will be callable from the 
 * chat.
 * @param args 
 */
export function Callable(args: PolkabotPluginParams): Function {
  return (ctor: Function) => {
    ctor.prototype.context.logger.silly('++ Callable ' + args.name);
    ctor.prototype.commandSet = args;
  };
}



/**
 * This class decorator simplifies how we can make config
 * values available. We pass the list of config params and
 * they will be made available.
 * @param params The list of config params
 */
export function Configured(params: string[]) {
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
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    Logger.silly('Command: %o', args);
    Logger.silly('Command called on %o %s %o', target, propertyKey, descriptor);

    const that =  target.prototype;

    const cmd: PluginCommand = {
      name: args.name || propertyKey.toLowerCase().replace('cmd', ''),
      description: args.description || '', // TODO: fill a default generic one
      argsRegexp: args.argsRegexp || null,
      adminOnly: args.adminOnly ?? true,
      handler: that[propertyKey]
    };
    that.context.logger.debug(cmd);
    that.commandSet.commands.push(cmd);
  };
}


