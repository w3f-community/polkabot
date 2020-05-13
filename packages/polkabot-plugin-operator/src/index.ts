#!/usr/bin/env node
import {
  PluginModule,
  PluginContext,
  CommandHandlerOutput,
  BotCommand,
  Controllable,
  PolkabotPluginBase,
  PluginCommandSet,
  PolkabotPlugin,
  PluginCommand,
  Room,
  SenderId,
  RoomId,
} from '@polkabot/api/src/plugin.interface';
import moment from 'moment';
import getCommandSet from './commandSet';
import { PolkabotChatbot } from '@polkabot/api/src/PolkabotChatbot';
import MatrixHelper from './matrix-helper';
import { packageJson } from 'package-json';
import { assert } from '@polkadot/util';
import { OperatorParams } from './types';

const capitalize: (string) => string = (s: string) => {
  if (typeof s !== 'string') return '';
  return s.charAt(0).toUpperCase() + s.slice(1);
};

export default class Operator extends PolkabotChatbot implements Controllable {

  public commandSet: PluginCommandSet;
  package: packageJson;
  controllables: Controllable[];
  context: PluginContext;
  params: OperatorParams;
  matrixHelper: MatrixHelper

  /**
   * This function reads the config and populate the params object of
   * this plugin as it should. The config object should not be used after that.
   */
  private loadParams(): OperatorParams {
    return {
      botMasterId: this.context.config.Get('MATRIX', 'BOTMASTER_ID'),
      botUserId: this.context.config.Get('MATRIX', 'BOTUSER_ID'),
    };
  }

  public constructor(mod: PluginModule, context: PluginContext, config?) {
    super(mod, context, config);
    this.commandSet = getCommandSet(this);
    assert(this.context.config, 'The config seems to be missing');
    this.params = this.loadParams();
    this.matrixHelper = new MatrixHelper(this.params);
  }

  public start(): void {
    this.watchChat();    
  }

  public stop(): void {
    // clean up here
  }

  public cmdStatus(_event: unknown, room: Room, ..._args: string[]): CommandHandlerOutput {
    const uptimeSec: number = process.uptime();
    const m = moment.duration(uptimeSec, 'seconds');

    return {
      code: 0,
      msg: null,
      answers: [
        {
          room,
          message: `I am still here! I've been running ${capitalize(this.package.name)} v${capitalize(
            this.package.version
          )} for ${m.humanize()}.\nCheck out the project at https://gitlab.com/Polkabot`
        }
      ]
    };
  }

  public cmdHelp(_event: Event, room: Room): CommandHandlerOutput {
    // TODO: later we could parse the msg below for keywords and try to make good guesses to focus the help a bit better
    // const msg: string = event.getContent().body;
    // fetch all the controllable, show their commands and deescriptions.
    let message = 'Here is also a list of all the loaded modules and their commands:<br/><ul>';
    this.controllables.map((controllable: Controllable) => {
      message += `<li>${controllable.commandSet.name}:</li><ul>`;
      controllable.commandSet.commands.map((command: PluginCommand) => {
        message += `<li><code>!${controllable.commandSet.alias} ${command.name}</code>: ${command.description} !${
          command.adminOnly ? ' (Master only)' : ''
        }</li>`;
      });
      message += '</ul>';
    });
    message += '</ul>';
    // this.answer( {
    //   room,
    //   message
    // });
    return {
      code: 0,
      msg: null,
      answers: [
        {
          room,
          message: 'Hi there, I am happy you got in touch, let me see if I can help.<br/>First of all, you probably should checkout the documentation at https://gitlab.com/Polkabot'
        },
        {
          room,
          message
        }
      ]
    };
  }

  /** This function takes a BotCommand and look for a plugin that can handle it.
   * If a plugin is found, its information and handler are returned.
   * If not, null is retuned. In that case it means we are not able to fullfill the request.
   */
  private matchCommand(cmd: BotCommand): PluginCommand | null {
    // first we look if the module is known
    const hits = this.controllables.filter((c: PolkabotPluginBase) => c.commandSet.alias === cmd.module);
    const controllable = hits.length > 0 ? (hits[0] as PolkabotPlugin) : null;

    if (!controllable) return null;
    
    this.context.logger.info(`${controllable.module.name} could be able to do the job... checking supported commands`);
    const handler: PluginCommand = controllable.commandSet.commands.find(c => c.name === cmd.command);
    this.context.logger.info(`Handler found: ${handler ? handler.name : null}`);

    return handler;
  }

  private watchChat(): void {
    this.context.matrix.on('Room.timeline', (event, room, _toStartOfTimeline) => {
      if (event.getType() !== 'm.room.message') {
        return;
      }

      // TODO - refactor into a common utility plugin or similar
      // const directChatRoomMemberIds = Object.keys(room.currentState.members);

      // const expectedDirectMessageRoomMemberIds = [this.context.config.matrix.botMasterId, this.context.config.matrix.botUserId];

      // // Has the Bot Master initiated a direct chat with the Bot
      // const isBotMasterAndBotInRoom = expectedDirectMessageRoomMemberIds.every(val => directChatRoomMemberIds.includes(val));
      // this.context.logger.info('Operator - isBotMasterAndBotInRoom: ', isBotMasterAndBotInRoom)

      // In general we don´t want the bot to react to its own messages!
      // const isSelf = senderId => {
      //   return senderId === this.context.config.matrix.botUserId;
      // };

      // this.context.logger.info('Operator - event.getContent()', event.getContent())
      const msg: string = event.getContent().body;
      const senderId: SenderId = event.getSender();

      // If we see our own message, we skip
      if (this.matrixHelper.isBot(senderId)) return;

      // If there is no ! and the string contains help, we try to help
      if (msg.indexOf('!') < 0 && msg.toLowerCase().indexOf('help') >= 0) {
        this.context.logger.info('Mentioning help in natural language');
        const output = this.cmdHelp(event, room);
        if (output.answers) {
          // this.answer(output.answers[0])
          output.answers.map(a => {
            this.answer(a);
          });
        }
        return;
      }

      const botCommand: BotCommand | null = PolkabotChatbot.getBotCommand(msg);
      // this.context.logger.info(" *** bot command:", JSON.stringify(botCommand, null, 2));
      if (!botCommand) {
        this.context.logger.info(`No bot command found in: >${msg}<`);
        this.answer({
          room,
          message: 'I was tought to smile when I don\'t get it. 😁'
        });
      } else {
        const cmdHandler = this.matchCommand(botCommand);

        // this.context.logger.info(" *** bot command handler:", JSON.stringify(cmdHandler, null, 2));

        if (cmdHandler) {
          this.context.logger.info(`handler found, running ${cmdHandler.name}`);
          const output: CommandHandlerOutput = cmdHandler.handler.bind(this)(event, room, botCommand.args);
          this.context.logger.info(`RET: ${output.code} : ${output.msg}`);
          if (output.answers) {
            // this.answer(output.answers[0])
            output.answers.map(a => {
              this.answer(a);
            });
          }
        } else {
          this.context.logger.info('No handler found');
          this.answer({
            room,
            message: 'Hmmm no one told me about that command. 😁'
          });
          return;
        }

        // TODO FIXME - this still triggers an error in the logs when the Bot Master
        // sends a message without an argument in the public room (i.e. `!say`)
        // if (!msg) {
        //   return;
        // }

        const senderRoomId: RoomId = event.sender.roomId;
        const roomIdWithBot: RoomId = room.roomId;

        if (this.matrixHelper.isPrivate(senderRoomId, roomIdWithBot)) {
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
            this.matrixHelper.isMaster(senderId) &&
            this.matrixHelper.isBotMasterAndBotInRoom(room)
            // && isBotMessageRecipient
          ) {
            this.context.logger.info('Operator - Bot received message from Bot Master in direct message');
            /**
             * Detect if the command received from the Bot Master is in
             * the following form: `!say <MESSAGE>` or `!status`
             */
            const capture = msg.match(/^!(?<cmd>\w+)(\s+(?<args>.*?))??$/i) || [];
            // this.context.logger.info("Operator - captured from Bot Master: ", capture);
            if (capture.length > 0 && capture.groups.cmd) {
              const _cmd: string = capture.groups.cmd;
              const _args = capture.groups.args;

              //   this.context.logger.info("Operator - cmd: ", cmd);
              //   this.context.logger.info("Operator - args: ", args);
              //   switch (cmd) {
              //     case "status":
              //       const uptime = (process.uptime() / 60 / 60).toFixed(2);
              //       this.answer(
              //         room.roomId,
              //         `Hey ${
              //           this.context.config.matrix.botMasterId
              //         }, I am still here, running for ${uptime} hours. Check out the project at https://gitlab.com/Polkabot`
              //       );
              //       break;
              //     case "say":
              //       this.context.logger.info("Operator - Received command !say:", cmd, args);
              //       const notifierMessage: NotifierMessage = {
              //         message: args
              //       };

              //       const notifierSpecs: NotifierSpecs = {
              //         notifiers: ["matrix", "demo", "all"]
              //       };

              //       this.context.polkabot.notify(notifierMessage, notifierSpecs);
              //       break;
              //     default:
              //       this.answer(
              //         room.roomId,
              //         `Operator - Command **!${cmd}** is not supported. You can use commands:
              //       !status OR !say <MESSAGE>`
              //       );
              //   }
              // }
            } else {
              this.context.logger.info(`Operator - Bot received message from non-Bot Master (sender: ${senderId}) in direct message`);
              // const re = new RegExp('')

              //           let capture = msg.match(/^!(?<cmd>\w+)(\s+(?<args>.*?))??$/i) || [];
              //           this.context.logger.info("Operator - captured from non-Bot Master: ", capture);
              //           if (capture.length > 0 && capture.groups.cmd) {
              //             const cmd: string = capture.groups.cmd;

              //             switch (cmd) {
              //               case "status":
              //                 const uptime = (process.uptime() / 60 / 60).toFixed(2);
              //                 this.answer(
              //                   room.roomId,
              //                   `I am still here! I've been running ${capitalize(this.context.pkg.name)} v${
              //                     this.context.pkg.version
              //                   } for ${uptime} hours.
              // Check out the project at https://gitlab.com/Polkabot`
              //                 );
              //                 break;
              //               default:
              //                 this.answer(room.roomId, `Operator - Command **!${cmd}** is not supported. You can use command: !status`);
              //             }
              //           }
            }
          }
        }
      }
    });
  }
}
