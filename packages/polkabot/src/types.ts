// import Olm from 'olm';
import { PolkabotNotifier } from '../../polkabot-api/src/PolkabotNotifier';

export interface EnvVar {
  name: string; // Name of the envrionment varibale
  description: string; // Description of what the var does
  masked?: boolean; // true for tokens, passwords, etc..
  regexp?: RegExp; // validation regexp
}

export interface EnvDictionnary {
  [key: string]: EnvVar;
}

/** 
 * This interface describes the Polkabot Config.
 * This is mostly a typescript helper, the config 
 * is managed by confmgr.
 */
export interface PolkabotConfig {
  polkadot: {
    nodeName: string; // This is just for you to remember. i.e. 'Crash Override'
    host: string;    // WebSocket host:port, usually :9944. i.e. 'ws://127.0.0.1:9944'
  };
  matrix: {
    botMasterId: string;    // Who is managing the bot. i.e. '@you:matrix.org'
    roomId: string;    // In what room is the bot active by default. i.e. '!<someid>:matrix.org'
    botUserId: string;    // Credentials of the bot. i.e. '@...:matrix.org'
    token: string;    // Token. i.e. 'your_token_here'
    baseUrl: string;
    loginUserId: string;
    loginUserPassword: string;
  };
}

export interface NotifiersTable {
  [type: string]: PolkabotNotifier[];
}

export type PolkabotGlobal = {
  localStorage: unknown;
};
