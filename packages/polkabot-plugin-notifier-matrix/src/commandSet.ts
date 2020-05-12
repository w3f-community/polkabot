import { PluginCommandSet } from '@polkabot/api/src/plugin.interface';
import MatrixNotifier from '.';

export default function getCommandSet(ref: MatrixNotifier): PluginCommandSet {
  return {
    name: 'MatrixNotifier',
    alias: 'matrix',
    commands: [
      {
        name: 'say',
        description: 'Show say something in the channel',
        argsRegexp: '',
        adminOnly: true,
        handler: ref.cmdSay
      }
    ]
  };
}
