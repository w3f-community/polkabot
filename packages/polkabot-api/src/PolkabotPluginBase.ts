import { packageJson } from 'package-json';
import * as path from 'path';
import { assert } from './utils';
import { PluginModule, PluginType, PluginContext } from './types';

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
}
