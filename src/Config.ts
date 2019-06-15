import process = require('process');
import dotenv from 'dotenv'
import * as path from 'path';

// type StringGetter = () => string;

interface EnvVar {
  name: string;
  description: string;
  masked?: boolean;
  regexp?: RegExp;
}

/** This interface describes how the Config object looks like. */
export interface Config {
  /** This is the configuration related to the Backend itself */
  readonly polkadot: {
    url: string;
  };
}

export interface EnvDictionnary {
  [key: string]: EnvVar;
}

const PREFIX = 'POLKABOT_'
export const ConfigFields: EnvDictionnary = {
  // Known ENV for Polkadot
  POLKADOT_URL: { name: PREFIX + 'POLKADOT_URL', description: 'The Polkadot WS url' },
    
  MATRIX_ROOM: { name: PREFIX + 'MATRIX_ROOM', description: '', regexp: /^.*$/ },
  MATRIX_TOKEN: { name: PREFIX + 'MATRIX_TOKEN', description: '', masked: true, regexp: /^.{3,}/ },
}

export class ConfigSingleton {
  private static instance: Config | null;

  private constructor() {
    ConfigSingleton.refresh()
  }

  /** If you need to access the config, use this method */
  public static getInstance(): Config {
    if (!ConfigSingleton.instance) {
      new ConfigSingleton()
    }
    return ConfigSingleton.instance
  }

  /** You likely will never have to use this function which
     * is mostly use for the tests. If you don't know, do NOT call
     * this function.
     */
  public static refresh() {
    const profile = process.env.NODE_ENV || 'production'
    const envfile = profile == 'production' ? path.resolve(process.cwd(), '.env') : path.resolve(process.cwd(), '.env.' + profile.toLowerCase())
    dotenv.config({ path: envfile })
    const ENV = process.env
    ConfigSingleton.instance = {
      polkadot: {
        url: ENV[ConfigFields.POLKADOT_URL.name],
      }    
    }
  }

  /** Calling this function will get an instance of the Config and attach it 
     * to the global scope.
     */
  public static loadToGlobal(): void {
    global['Config'] = ConfigSingleton.getInstance()
  }

  /** Validate the config and return wheather it is valid or not */
  public static Validate(): boolean {
    let result = true
    console.log('Validating process.env variables:')
    Object.entries(ConfigFields).map(([_key, env]) => {
      if (env.regexp != undefined) {
        const value = process.env[env.name] || ''
        const regex = RegExp(env.regexp);
        const testResult = regex.test(value)
        // console.log(`Checking ${env.name} =\t${value} with ${env.regexp} => ${testResult?"OK":"FAIL"}`)
        console.log(`  - Checking ${env.name} \t=> ${testResult ? 'OK  ' : 'FAIL'}\t${env.masked ? '*****' : process.env[env.name]}`)
        result = result && testResult
      }
    });
    return result
  }

  /** Show the ENV variables this application cares about */
  public static getSupportedEnv(): EnvDictionnary {
    return ConfigFields
  }

  /**
     * Display the current ENV to ensure everything that is used matches 
     * the expectations.
     */
  public static dumpEnv(): void {
    console.log('================== ENV ==================')
    Object.entries(ConfigFields).map(([_key, env]) => {
      console.log(`- ${env.name}: ${env.description}\n  value: ${env.masked ? (process.env[env.name] ? '*****' : 'empty') : process.env[env.name]}`)
    });

    console.log('================== === ==================')
  }
}
