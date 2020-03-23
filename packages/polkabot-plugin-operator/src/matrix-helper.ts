import { RoomId } from '@polkabot/api/src/plugin.interface';

export default class MatrixHelper {

  public static isPrivate(senderRoomId: RoomId, roomIdWithBot: RoomId): boolean {
    return senderRoomId === roomIdWithBot;
  }

  public static isSelf(senderId, botUserId): boolean {
    return senderId === botUserId;
  }
}
