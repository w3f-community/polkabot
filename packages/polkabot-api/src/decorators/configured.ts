import LoggerSingleton from '@polkabot/api/src/LoggerFactory';

const Logger = LoggerSingleton.getInstance();

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
 * @deprecated This is currently not used and will likely be removed
 */
export function Configured(params: ConfiguredDecoratorArgs): Function {
  return (target: Configured) => {
    Logger.debug('@Configured');
    target.configApplication = params.application ? params.application : 'POLKABOT';
    target.configModule = params.module ? params.module : (target as any).name.toUpperCase();

    if (!target.configKeys) target.configKeys = params.keys;

    target.getKeys = (): string[] => {
      return target.configKeys;
    };

    target.getValue = function <T>(key: string): T {
      Logger.debug(`Get key for ${target.configApplication}_${target.configModule}_${key}`);
      throw new Error('@Configured is not implemented')
      //return 42 as unknown as T;
    };
  };
}
