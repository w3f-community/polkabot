import { RoomId, SenderId, Room } from '@polkabot/api/src/plugin.interface';
import { OperatorParams } from './types';

export default class MatrixHelper {
  params: OperatorParams;

  public constructor(p: OperatorParams) {
    this.params = p;
  }

  public isPrivate(senderRoomId: RoomId, roomIdWithBot: RoomId): boolean {
    return senderRoomId === roomIdWithBot;
  }

  public isBot(senderId): boolean {
    return senderId === this.params.botUserId;
  }

  /**
   * Check if the sender id of the user that sent the message
   * is the Bot Master's id
   */
  public isMaster(senderId: SenderId): boolean {
    return senderId === this.params.botMasterId;
  }

  /**
   * Is the chat room name the same name as the Bot's name
   * After string manipulation to get just the username from the Bot's
   * user id (i.e. @mybot:matrix.org ---> mybot)
   * @param room the room
   */
  public isBotMessageRecipient(room: Room): boolean {
    return (
      room.name ===
      this.params.botUserId
        .split(':')
        .shift()
        .substring(1)
    );
  }

  /**
   * Has the Bot Master initiated a direct chat with the Bot
   */ 
  public isBotMasterAndBotInRoom(room: Room): boolean {
    const expectedDirectMessageRoomMemberIds = [this.params.botMasterId, this.params.botUserId];
    const directChatRoomMemberIds = Object.keys(room.currentState.members);
    return expectedDirectMessageRoomMemberIds.every(val => directChatRoomMemberIds.includes(val));
  }
}
