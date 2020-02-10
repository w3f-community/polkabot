import { PluginCommands } from "@polkabot/api/src/plugin.interface";
import Blocthday from ".";
import Operator from ".";

export default function getCommands(ref: Operator): PluginCommands {
  return {
    name: "Operator",
    alias: "op",
    commands: [
      {
        name: "status",
        description: "Show status of the plugin",
        argsRegexp: "",
        handler: ref.cmdStatus
      }
    ]
  };
}
