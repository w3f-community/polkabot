#!/usr/bin/env node
import BN from 'bn.js';
import { PolkabotWorker } from '@polkabot/api/src/PolkabotWorker';
import { PluginModule, PluginContext } from '@polkabot/api/src/types';

type StallWatcherConfig = {
  duration: number;
}
export default class StallWatcher extends PolkabotWorker {
  private stalled: boolean;
  private lastBlockTime: Date;
  private lastBlockNumber: BN;
  private watchdogId: NodeJS.Timeout;
  private params: StallWatcherConfig;
  private unsubFn: Function;

  public constructor(mod: PluginModule, context: PluginContext, config?) {
    super(mod, context, config);
    this.params = {
      duration: this.context.config.Get('STALLWATCHER', 'DURATION')
    };
    this.stalled = null;
  }

  public start(): void {
    this.context.logger.info('StallWatcher - Starting with config:', this.params);
    this.watchChain().catch(error => {
      console.error('StallWatcher - Error subscribing to chain head: ', error);
    });

    // this.watchChat();
  }

  public stop(): void  {
    if (this.unsubFn) this.unsubFn();
  }

  async watchChain(): Promise<void> {
    // Reference: https://polkadot.js.org/api/examples/promise/02_listen_to_blocks/
    this.unsubFn = await this.context.polkadot.rpc.chain.subscribeNewHeads(header => {
      clearTimeout(this.watchdogId);
      // this.context.logger.info('StallWatcher: ' + this.getDuration().toFixed(2) + 's')
      this.watchdogId = setTimeout(this.alert.bind(this), this.params.duration * 1000);
      this.lastBlockNumber = header.number.unwrap().toBn();
      if (this.stalled) {
        this.context.polkabot.notify(
          {
            message: `Network no longer stalled, new block #${this.lastBlockNumber.toString(
              10
            )} came in after ${this.getDuration().toFixed(2)}s`
          },
          { notifiers: ['matrix'] }
        );

        this.stalled = false;
      }
      this.lastBlockTime = new Date();
    });
  }

  private getDuration(): number {
    return (new Date().getTime() - this.lastBlockTime.getTime()) / 1000;
  }

  private alert(): void {
    this.stalled = true;

    this.context.polkabot.notify(
      {
        message: `CRITICAL: Network seems to be stalled !!! Block #${this.lastBlockNumber.toString(10)} was seen ${
          this.params.duration
        }s ago.`
      },
      { notifiers: ['matrix'] }
    );
  }

  // answer(roomId, msg) {
  //   this.context.matrix.sendTextMessage(roomId, msg);
  // }

  // Many of the bot function should not be here. This is a worker, not a bot.
  // The worker could however publish supported commands the bot can fetch with the form
  // !sw duration 42
  // !sw restart
  // !sw help

  //   watchChat() {
  //     this.context.matrix.on("Room.timeline", (event, room, toStartOfTimeline) => {
  //       if (event.getType() !== "m.room.message") {
  //         return;
  //       }
  //       const directChatRoomMemberIds = Object.keys(room.currentState.members);

  //       const expectedDirectMessageRoomMemberIds = [this.context.config.matrix.botMasterId, this.context.config.matrix.botUserId];

  //       // Has the Bot Master initiated a direct chat with the Bot
  //       const isBotMasterAndBotInRoom = expectedDirectMessageRoomMemberIds.every(val => directChatRoomMemberIds.includes(val));
  //       // this.context.logger.info('StallWatcher - isBotMasterAndBotInRoom: ', isBotMasterAndBotInRoom)

  //       // Is the chat room name the same name as the Bot's name
  //       // After string manipulation to get just the username from the Bot's
  //       // user id (i.e. @mybot:matrix.org ---> mybot)
  //       const isBotMessageRecipient =
  //         room.name ===
  //         this.context.config.matrix.botUserId
  //           .split(":")
  //           .shift()
  //           .substring(1);
  //       // this.context.logger.info('StallWatcher - isBotMessageRecipient: ', isBotMessageRecipient)

  //       /**
  //        * Check that the room id where the sender of the message
  //        * sent the message from is the same as the room id where
  //        * that the bot is in.
  //        */
  //       function isPrivate(senderRoomId, roomIdWithBot) {
  //         return senderRoomId === roomIdWithBot;
  //       }

  //       /**
  //        * Check if the sender id of the user that sent the message
  //        * is the Bot Master's id
  //        */
  //       // const isOperator = senderId => {
  //       //   const isSenderOperator = senderId === this.context.config.matrix.botMasterId;
  //       //   // this.context.logger.info('StallWatcher - isSenderOperator: ', isSenderOperator)
  //       //   return isSenderOperator;
  //       // };

  //       // const msg = event.getContent().body;
  //       // // sends a message without an argument in the public room (i.e. `!say`)
  //       // if (!msg) {
  //       //   return;
  //       // }

  //       // const senderId = event.getSender();
  //       // const senderRoomId = event.sender.roomId;
  //       // const roomIdWithBot = room.roomId;

  //       // this.context.logger.info('StallWatcher - msg: ', msg)
  //       // this.context.logger.info('StallWatcher - senderId: ', senderId)
  //       // this.context.logger.info('StallWatcher - senderRoomId', senderRoomId)
  //       // this.context.logger.info('StallWatcher - roomIdWithBot', roomIdWithBot)

  //       if (isPrivate(senderRoomId, roomIdWithBot)) {
  //         if (isOperator(senderId) && isBotMasterAndBotInRoom && isBotMessageRecipient) {
  //           // this.context.logger.info('StallWatcher - Bot received message from Bot Master in direct message')
  //           /**
  //            * Detect if the command received from the Bot Master is in
  //            * the following form: `!sw duration <DURATION_IN_SECONDS>`
  //            */
  //           let capture = msg.match(/^!((?<mod>\w+)\s+)?(?<cmd>\w+)(\s+(?<args>.*?))??$/i) || [];
  //           // this.context.logger.info('StallWatcher - captured from Bot Master: ', capture)
  //           if (capture.length > 0 && capture.groups.cmd) {
  //             const mod = capture.groups.mod;
  //             const cmd = capture.groups.cmd;
  //             const args = capture.groups.args;

  //             if (mod !== "sw") return;

  //             this.context.logger.info("StallWatcher - mod: ", mod);
  //             this.context.logger.info("StallWatcher - cmd: ", cmd);
  //             this.context.logger.info("StallWatcher - args: ", args);
  //             switch (cmd) {
  //               case "duration":
  //                 const val = parseFloat(args);
  //                 if (!isNaN(val)) {
  //                   this.params.duration = val;
  //                 }
  //                 this.answer(room.roomId, `Threshold changed to ${this.params.duration}s`);
  //                 break;
  //               default:
  //                 this.answer(
  //                   room.roomId,
  //                   `StallWatcher - Command *!${cmd}* is not supported. You can use commands:
  // !sw duration 6.8`
  //                 );
  //             }
  //           }
  //         }
  //       }
  //     });
  //   }
}
