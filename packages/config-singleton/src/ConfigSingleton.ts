import process = require('process');
import dotenv from 'dotenv';
import * as path from 'path';
import { ConfigSpecs, ConfigDictionnaryRaw, ConfigDictionnarySimple } from './types';

interface IConfig {
  Validate(): boolean;
}

type GetterOpts = {
  specs?: ConfigSpecs;
  clean?: boolean;
};

export class ConfigSingleton {
  private static fullConfig?: ConfigDictionnaryRaw;
  private static cleanConfig?: ConfigDictionnarySimple;
  private static instance: ConfigSingleton;

  private specs: ConfigSpecs;

  private constructor(specs: ConfigSpecs) {
    if (!specs) throw new Error('Missing specs in ctor');
    this.specs = specs;
    this.refresh();
  }

  /** If you need to access the config, use this method */
  // this method MUST return the clean config for simple usage BUT the full one to validate
  // we need however to store the full config for validate
  public static getInstance(specs?: ConfigSpecs): ConfigSingleton {
    if (!this.instance && !specs) {
      throw new Error("Missing specs");
       
    }
    if (!this.instance && specs) {
      this.instance = new ConfigSingleton(specs);
    }

    // if (!ConfigSingleton.fullConfig && !specs) throw new Error('Missing specs');
    // if (!ConfigSingleton.fullConfig || specs) {
    //   ConfigSingleton.fullConfig = new ConfigSingleton(specs).getConfig(false);
    //   ConfigSingleton.cleanConfig = new ConfigSingleton(specs).getConfig(true);
    // }
    return this.instance;
    // return ConfigSingleton.cleanConfig;
  }

  // TODO: remove the argument, when we get the config, it is always clean
  public getConfig(clean: boolean = true): ConfigDictionnarySimple {
    const stuff: any = this.specs.config; //process.env;

    Object.entries(stuff).map(([key, _val]) => {
      if (clean) {
        stuff[key] = process.env[key];
      } else {
        stuff[key].value = process.env[key];
      }
    });
    // Hook up functions
    stuff.Validate = this.Validate.bind(this);

    return stuff;
  }

  // public getSpecs(): ConfigSpecs {
  //   return this.specs;
  // }

  private static getEnvFile(): string {
    const profile = process.env.NODE_ENV || 'production';
    // console.log('NODE_ENV profile: ', profile);
    const envfile =
      profile == 'production'
        ? path.resolve(process.cwd(), '.env')
        : path.resolve(process.cwd(), '.env.' + profile.toLowerCase());
    return envfile;
  }

  /** You likely will never have to use this function which
   * is mostly use for the tests. If you don't know, do NOT call
   * this function, it would take time and likely do nothing
   * interesting for you.
   */
  public refresh(): void {
    const envfile = ConfigSingleton.getEnvFile();
    // console.log('ENV file:', envfile);
    dotenv.config({ path: envfile });
    const ENV = process.env;

    // console.log(ENV);
    // this.filteredEnv = Object.entries(process.env).filter(([key, val]) => {
    //   return key.startsWith('SAMPLE');
    // });
    // ConfigSingleton.instance = new ConfigSingleton(this.specs)
  }

  // assert((ConfigSingleton.instance.polkadot.nodeName || '').length > 0, "The extracted config does not look OK")
  // }

  /** Calling this function will get an instance of the Config and attach it
   * to the global scope.
   */
  public static loadToGlobal(): void {
    global['Config'] = ConfigSingleton.getInstance().getConfig();
  }

  /** Validate the config and return wheather it is valid or not */
  public Validate(): boolean {
    let result = true;
    console.log(this.specs);
    Object.entries(this.specs.config).map(([_key, env]) => {
      if (env.options) {
        const value = process.env[env.name] || '';
        if (env.options.regexp != undefined) {
          const regex = RegExp(env.options.regexp);
          const testResult = regex.test(value);
          // console.log(
          //   `  - Checking ${env.name} against ${regex} => ${testResult ? 'OK  ' : 'FAIL'}\t${
          //     env.options.masked ? '*****' : process.env[env.name]
          //   }`
          // );
          result = result && testResult;
        }
        result = result && (!env.options.mandatory || (env.options.mandatory && value.length > 0));
      }
    });
    return result;
  }

  /** Show the ENV variables this application cares about */
  // public static getSupportedEnv(): ConfigSpecs {
  //   return ConfigSingleton.g;
  // }

  /**
   * Display the current ENV to ensure everything that is used matches
   * the expectations.
   */
  public dumpEnv(logger: (...args) => void): void {
    const container = `${this.specs.container.prefix}_${this.specs.container.module}`;
    logger(`===> ${container} ENV:`);
    Object.entries(this.specs.config).map(([_key, env]) => {
      logger(
        `- ${env.name.replace(container + '_', '')}: ${env.description}\n${
          env.options && env.options.regexp ? '    regexp: ' + env.options.regexp + '\n' : ''
        }    value: ${
          env.options && env.options.masked
            ? process.env[env.name]
              ? '*****'
              : 'empty'
            : process.env[env.name]
        }`
      );
    });

    logger('========================================');
  }
}
