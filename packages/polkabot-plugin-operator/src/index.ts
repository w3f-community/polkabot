import moment from 'moment';
import { PolkabotChatbot } from '@polkabot/api/src/PolkabotChatbot';
import MatrixHelper from './matrix-helper';
import { assert } from '@polkadot/util';
import { OperatorParams } from './types';
import { isHelpNeeded } from './helpers';
import { Event, MatrixEventType, Controllable, PluginCommand, PluginContext, PluginModule, CommandHandlerOutput, BotCommand, SenderId, RoomId, Room } from '@polkabot/api/src/types';
import { capitalize, getClass, PolkabotPluginBase } from '@polkabot/api/src';
import { Command, Callable } from '@polkabot/api/src/decorators';

@Callable({ alias: 'op' })
export default class Operator extends PolkabotChatbot {
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

    // Calling this method in the ctor is mandatory
    PolkabotPluginBase.bindCommands(this);

    assert(this.context.config, 'The config seems to be missing');
    this.params = this.loadParams();
    this.matrixHelper = new MatrixHelper(this.params);
  }

  public start(): void {
    this.watchChat();
  }

  @Command()
  public cmdStatus(_event: Event, room: Room, ..._args: string[]): CommandHandlerOutput {
    const uptimeSec: number = process.uptime();
    const m = moment.duration(uptimeSec, 'seconds');

    return {
      code: 0,
      logMsg: null,
      answers: [
        {
          room,
          message: `I am still here! I've been running ${capitalize(this.package.name)} v${capitalize(this.package.version)} 
for ${m.humanize()}.\nCheck out the project at https://gitlab.com/Polkabot`
        }
      ]
    };
  }

  @Command({ description: 'This shows some help. It is also triggered when the user write anything mentioning HELP' })
  public cmdHelp(_event: Event, room: Room): CommandHandlerOutput {
    let message = 'Here is also a list of all the loaded modules and their commands:<br/><ul>';
    assert(this.controllables.length, 'No controllable found!');

    this.controllables.map((controllable: Controllable) => {
      const CtrlClass = getClass<Controllable>(controllable);
      assert(CtrlClass.isControllable, 'Houston, we expect a controllable here!');

      message += `<li>${CtrlClass.meta.name}:</li><ul>`;
      Object.keys(CtrlClass.commands).map((commandName: string) => {
        const command = CtrlClass.commands[commandName];
        message += `<li>${command.adminOnly ? '🔒' : '👐'}<code>!${CtrlClass.meta.alias} ${command.name}</code>: ${command.description}</li>`;
      });
      message += '</ul>';
    });
    message += '</ul>';
    return {
      code: 0,
      logMsg: null,
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

  private watchChat(): void {
    this.context.matrix.on('Room.timeline', (event: Event, room: Room, _toStartOfTimeline) => {
      const evenType: MatrixEventType = event.getType();
      this.context.logger.silly(`Got event: ${evenType}`);

      if (evenType == 'm.room.encrypted') {
        this.context.logger.warn('We got an encrypted message but we don\'t support encryption! We ignored it');
        return;
      }

      if (evenType !== 'm.room.message') {
        this.context.logger.silly('Event %s : %s', evenType, JSON.stringify(event, null, 0));
        return;
      }

      // this.context.logger.info('Operator - event.getContent()', event.getContent())
      const msg: string = event.getContent().body;

      const senderId: SenderId = event.getSender();
      this.context.logger.debug(`${senderId}> ${msg}`);

      // If we see our own message, we skip
      if (this.matrixHelper.isBot(senderId)) return;

      if (isHelpNeeded(msg)) {
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
          message: 'I was tought to smile when I don\'t get it. 😁',
          html: true
        });
      } else {
        const cmdHandler: PluginCommand = PolkabotChatbot.matchCommand(this.controllables, botCommand);
        // const instance = PolkabotChatbot.getControllableInstance(this.controllables, botCommand);
        // assert(instance !== undefined, 'Instance NOT found');
        // this.context.logger.info(" *** bot command handler:", JSON.stringify(cmdHandler, null, 2));

        if (cmdHandler) {
          this.context.logger.info(`handler found, running [${cmdHandler.name}]`);
          if (botCommand.args)
            this.context.logger.debug(`args: ${botCommand.args.join(' ')}`);

          const output: CommandHandlerOutput = cmdHandler.handler(event, room, botCommand.args);

          this.context.logger.info(`RET: ${output.code} : ${output.logMsg}`);
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
            message: 'Hmmm no one told me about that command. You may want to try to ask for help.'
          });
          return;
        }

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
            if (capture.length > 0 && capture.groups.cmd) {
              const _cmd: string = capture.groups.cmd;
              const _args = capture.groups.args;
            } else {
              this.context.logger.info(`Operator - Bot received message from non-Bot Master (sender: ${senderId}) in direct message`);
            }
          }
        }
      }
    });
  }
}
