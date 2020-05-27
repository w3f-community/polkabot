import { packageJson } from 'package-json';
import * as path from 'path';
import { assert } from './utils';
import { PluginModule, PluginType, PluginContext, Controllable } from './types';
import { getClass } from './helpers';

/**
 * Any plugin must extend this base class. It provides the basic
 * functions any plugin should provide.
 */
export class PolkabotPluginBase {
  /** This is describing our plugin before we could load it */
  public module: PluginModule;
  /** The context is passed from polkabot and contains useful resources such as the logger and the connection to polkadot  */
  public context: PluginContext;
  /** Once we successfully loaded the plugin, its package.json is available to us */
  public package: packageJson;
  /** Each plugin has a given type, descriving how it can interacts 
   */
  public type: PluginType;

  constructor(type: PluginType, mod: PluginModule, context: PluginContext, _config?) {
    this.type = type;
    this.context = context;
    this.module = mod;

    const packageFile = path.join(mod.path, 'package.json');
    this.context.logger.debug(`loading package from ${packageFile}`);
    this.package = require(packageFile) as packageJson;

    assert(this.package, `package ${this.module.name} failed to load properly`);
  }

  public toString = (): string => {
    return `[${this.type}] ${this.module.name}`;
  }

  /**
   * Get the value of a given [[key]] from the module matching the plugin's name.
   * For instance, calling `this.getConfig('FOO')` from Blocthday will invoke 
   * confmgr and request POLKABOT_BLOCTHDAY_FOO.
   * 
   * Calling `this.getConfig('FOO', 'BDAY')` forces using the BDAY module: POLKABOT_BDAY_FOO
   * 
   * @param key Configuration key
   * @param module Optionnal module name
   */
  public getConfig<T>(key: string, module?: string): T {
    return this.context.config.Get(module ? module : this.constructor.name.toUpperCase(), key) as T;
  }

  /**
   * This utility function may be called from the ctor of classes
   * that want to be controllable.
   * @param this 
   */
  public static bindCommands(that: PolkabotPluginBase): void {
    assert(typeof that !== 'undefined', 'Binding to undefined is no good idea!');
    const CtrlClass = getClass(that) as unknown as Controllable;
    assert(typeof CtrlClass.commands !== 'undefined', 'No command was set!');
    // if (CtrlClass.commands) {
    // let counter = 0;
    Object.keys(CtrlClass.commands).map((key: string) => {
      // const command = that.commands[key]
      //console.log('command:', command)
      that.context.logger.silly('Binding method %s:%s', CtrlClass.meta.name, key);  // TODO; check here, are we binding the status function or cmdStatus ?


      // TODO: fix this cheap trick: we want to use the original method name here, not hope that it was called cmdSomething
      CtrlClass.commands[key].handler = CtrlClass.commands[key].handler.bind(that);
      // counter++;
    });
    // this.context.logger.warn('Bound %d commands', counter)
    // } 
    // else {
    //   // this.context.logger.warn('No command to bind')
    // }
  }
}
