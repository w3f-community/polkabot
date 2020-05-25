import { PolkabotPlugin, Controllable, PluginType } from '@polkabot/api/src/types';
import { PolkabotWorker, PolkabotNotifier, PolkabotChatbot } from '@polkabot/api/src';

export function isWorker(candidate: PolkabotPlugin): candidate is PolkabotWorker {
  return (candidate as PolkabotWorker).start !== undefined;
}

export function isNotifier(candidate: PolkabotPlugin): candidate is PolkabotNotifier {
  return (candidate as PolkabotNotifier).notify !== undefined;
}

/**
 * Here we test an 'assumed' Controllable that may or not be one.
 * @param candidate The class to be checked. Note that you should not pass a Controllable object here but the class itself.
 */
export function isControllable(candidate: Function): boolean {
  return (candidate as unknown as Controllable).isControllable === true;
}

export function isChatBot(candidate: PolkabotPlugin): candidate is PolkabotChatbot {
  return (candidate as PolkabotChatbot).type === PluginType.Chatbot;
}
