import { PolkabotPlugin, Controllable, PluginType } from '@polkabot/api/src/types';
import { PolkabotWorker, PolkabotNotifier, PolkabotChatbot } from '@polkabot/api/src';

export function isWorker(candidate: PolkabotPlugin): candidate is PolkabotWorker {
  return (candidate as PolkabotWorker).start !== undefined;
}

export function isNotifier(candidate: PolkabotPlugin): candidate is PolkabotNotifier {
  return (candidate as PolkabotNotifier).notify !== undefined;
}

export function isControllable(candidate: PolkabotPlugin): boolean {
  const res = (candidate as unknown as Controllable).getCommandSet !== undefined;
  return res;
}

export function isChatBot(candidate: PolkabotPlugin): candidate is PolkabotChatbot {
  return (candidate as PolkabotChatbot).type === PluginType.Chatbot;
}
