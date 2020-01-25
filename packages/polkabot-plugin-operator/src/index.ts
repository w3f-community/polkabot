#!/usr/bin/env node
import {
  PolkabotChatbot,
  NotifierMessage,
  NotifierSpecs,
  PluginModule,
  PluginContext
} from "@polkabot/api/src/plugin.interface";

export default class Operator extends PolkabotChatbot {
  public constructor(mod: PluginModule, context: PluginContext, config?) {
    super(mod, context, config);
  }

  public start(): void {
    // Todo: this should be done in private and on demand
    // ideally, each plugin report its commands and the bot
    // provide the instructions instead of having each plugin to the work.
    // this.showInstructions()
    this.watchChat();
  }

  showInstructions() {
    // Send message to the room notifying users how to use the bot
    const notifierMessage: NotifierMessage = {
      message:
        "Polkabot Operator Plugin public user usage instructions:\n  1) Ask Polkabot Operator to provide node info with command: !status"
    };

    const notifierSpecs: NotifierSpecs = {
      notifiers: ["matrix", "demo", "all"]
    };

    this.context.polkabot.notify(notifierMessage, notifierSpecs);
  }

  answer(roomId, msg) {
    this.context.matrix.sendTextMessage(roomId, msg);
  }

  watchChat() {
    this.context.matrix.on("Room.timeline", (event, room, _toStartOfTimeline) => {
      if (event.getType() !== "m.room.message") {
        return;
      }

      // TODO - refactor into a common utility plugin or similar
      const directChatRoomMemberIds = Object.keys(room.currentState.members);

      const expectedDirectMessageRoomMemberIds = [this.context.config.matrix.botMasterId, this.context.config.matrix.botUserId];

      // Has the Bot Master initiated a direct chat with the Bot
      const isBotMasterAndBotInRoom = expectedDirectMessageRoomMemberIds.every(val => directChatRoomMemberIds.includes(val));
      // console.log('Operator - isBotMasterAndBotInRoom: ', isBotMasterAndBotInRoom)

      // Is the chat room name the same name as the Bot's name
      // After string manipulation to get just the username from the Bot's
      // user id (i.e. @mybot:matrix.org ---> mybot)
      const isBotMessageRecipient =
        room.name ===
        this.context.config.matrix.botUserId
          .split(":")
          .shift()
          .substring(1);
      // console.log('Operator - isBotMessageRecipient: ', isBotMessageRecipient)

      

      /**
       * Check if the sender id of the user that sent the message
       * is the Bot Master's id
       */
      const isMaster = senderId => {
        const isSenderOperator = senderId === this.context.config.matrix.botMasterId;
        // console.log('Operator - isSenderOperator: ', isSenderOperator)
        return isSenderOperator;
      };

      // In general we don´t want the bot to react to its own messages!
      const isSelf = senderId => {
        return senderId === this.context.config.matrix.botUserId;
      };

      // console.log('Operator - event.getContent()', event.getContent())
      const msg = event.getContent().body;

      console.log("msg", msg);

      // FIXME - this still triggers an error in the logs when the Bot Master
      // sends a message without an argument in the public room (i.e. `!say`)
      if (!msg) {
        return;
      }

      const senderId = event.getSender();
      const senderRoomId = event.sender.roomId;
      const roomIdWithBot = room.roomId;

      console.log(senderId, senderRoomId, roomIdWithBot);

      // If we see our own message, we skip
      if (isSelf(senderId)) return;

      // console.log('Operator - msg: ', msg)
      // console.log('Operator - senderId: ', senderId)
      // console.log('Operator - senderRoomId', senderRoomId)
      // console.log('Operator - roomIdWithBot', roomIdWithBot)

      console.log("isPrivate", this.isPrivate(senderRoomId, roomIdWithBot));
      console.log("isMaster", isMaster(senderId));
      console.log("isBotMasterAndBotInRoom", isBotMasterAndBotInRoom);
      console.log("isBotMessageRecipient", isBotMessageRecipient);

      if (this.isPrivate(senderRoomId, roomIdWithBot)) {
        /**
         * Check that the senderId is the Bot Master with isOperator
         * Also check that the message is from a direct message between
         * the Bot Master and the Bot by checking that isBotMasterAndBotInRoom
         * and isBotMessageRecipient are both true since if the user
         * is the Bot Master they can ask the Bot to do more actions than
         * public users, and we do not want to show error messages
         * from the Bot Master in the public room due to entry of invalid
         * commands, we only want them to appears in the direct message.
         **/
        if (
          isMaster(senderId) &&
          isBotMasterAndBotInRoom
          // && isBotMessageRecipient
        ) {
          console.log("Operator - Bot received message from Bot Master in direct message");
          /**
           * Detect if the command received from the Bot Master is in
           * the following form: `!say <MESSAGE>` or `!status`
           */
          let capture = msg.match(/^!(?<cmd>\w+)(\s+(?<args>.*?))??$/i) || [];
          console.log("Operator - captured from Bot Master: ", capture);
          if (capture.length > 0 && capture.groups.cmd) {
            const cmd: string = capture.groups.cmd;
            const args = capture.groups.args;

            console.log("Operator - cmd: ", cmd);
            console.log("Operator - args: ", args);
            switch (cmd) {
              case "status":
                const uptime = (process.uptime() / 60 / 60).toFixed(2);
                this.answer(
                  room.roomId,
                  `Hey ${
                    this.context.config.matrix.botMasterId
                  }, I am still here, running for ${uptime} hours. Check out the project at https://gitlab.com/Polkabot`
                );
                break;
              case "say":
                console.log("Operator - Received command !say:", cmd, args);
                const notifierMessage: NotifierMessage = {
                  message: args
                };

                const notifierSpecs: NotifierSpecs = {
                  notifiers: ["matrix", "demo", "all"]
                };

                this.context.polkabot.notify(notifierMessage, notifierSpecs);
                break;
              default:
                this.answer(
                  room.roomId,
                  `Operator - Command **!${cmd}** is not supported. You can use commands:
                !status OR !say <MESSAGE>`
                );
            }
          }
        } else {
          console.log(`Operator - Bot received message from non-Bot Master (sender: ${senderId}) in direct message`);
          // const re = new RegExp('')

          let capture = msg.match(/^!(?<cmd>\w+)(\s+(?<args>.*?))??$/i) || [];
          console.log("Operator - captured from non-Bot Master: ", capture);
          if (capture.length > 0 && capture.groups.cmd) {
            const cmd: string = capture.groups.cmd;

            switch (cmd) {
              case "status":
                const uptime = (process.uptime() / 60 / 60).toFixed(2);
                this.answer(
                  room.roomId,
                  `I am still here! I've been running ${capitalize(this.context.pkg.name)} v${
                    this.context.pkg.version
                  } for ${uptime} hours.
Check out the project at https://gitlab.com/Polkabot`
                );
                break;
              default:
                this.answer(room.roomId, `Operator - Command **!${cmd}** is not supported. You can use command: !status`);
            }
          }
        }
      }
    });
  }
}

const capitalize = s => {
  if (typeof s !== "string") return "";
  return s.charAt(0).toUpperCase() + s.slice(1);
};
