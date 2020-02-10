import { PluginCommandSet } from "@polkabot/api/src/plugin.interface";
import Blocthday from ".";
import Operator from ".";

export default function getCommandSet(ref: Operator): PluginCommandSet {
  return {
    name: "Operator",
    alias: "op",
    commands: [
      {
        name: "status",
        description: "Show status of the plugin",
        argsRegexp: "",
        adminOnly: false,
        handler: ref.cmdStatus
      }
    ]
  };
}
