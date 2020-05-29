import LoggerSingleton from '@polkabot/api/src/LoggerFactory';
import { assert } from '../utils';
import { CallableMeta, ControllableMeta } from '../types';

const Logger = LoggerSingleton.getInstance();

/**
 * This class decorator signals a class that will be callable from the 
 * chat (usually [[Operator]]). It dynamically sets up a few of the members and helpers required
 * by a Controllable.
 * @param args 
 */
export function Callable(args?: CallableMeta): Function {
  // Note we cannot use context yet
  return (target: any) => {
    Logger.silly(`@Callable on ${(target as unknown as Function).name}`);
    const meta: ControllableMeta = {
      name: args && args.name ? args.name : (target as any).name,
      alias: args && args.alias ? args.alias : (target as any).name.toLowerCase()
    };

    // Implement Controllable
    // We keep the following so that we have it initialized even if the user 
    // did not use @Command yet.
    if (typeof target.commands === 'undefined') target.commands = {};

    const commandCount = Object.keys(target.commands).length;
    assert(commandCount > 0, 'A Callable without command does not sound good!');
    target.meta = meta;
    target.isControllable = commandCount > 0;
  };
}

