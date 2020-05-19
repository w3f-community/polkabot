import Olm from 'olm';
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

/** This interface describes how the Polkabot Config
 * object looks like. */
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
  Olm: Olm;
  localStorage: any;
};


// export interface MatrixClient {
//   sendTextMessage: (roomId, string) => void;
//   sendHtmlMessage: (roomId: RoomId, html: string, text: string) =>  void;
//   //on: (string, (event, room, _toStartOfTimeline) => void) => void;
//   once: (event: string, handler: Function) => void;
//   startClient(msgToSHow: number);
//   login: (pass: string, options: Record<string, unknown>) => Promise<MatrixClient>;
// }
