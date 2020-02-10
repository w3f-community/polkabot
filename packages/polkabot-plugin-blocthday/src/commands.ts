import { PluginCommands } from "@polkabot/api/src/plugin.interface";
import Blocthday from ".";

export default function getCommands(ref: Blocthday): PluginCommands {
  return {
    name: "Blocthday",
    alias: "bday",
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