import { PluginCommandSet } from "@polkabot/api/src/plugin.interface";
import Blocthday from ".";

export default function getCommandSet(ref: Blocthday): PluginCommandSet {
  return {
    name: "Blocthday",
    alias: "bday",
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
