import { RoomId } from '@polkabot/api/src/plugin.interface';

export default class MatrixHelper {

  // TODO: not implemented!
  public static isPrivate(_senderRoomId: RoomId, _roomIdWithBot: RoomId): boolean {
    return false;
    // throw new Error("Method not implemented.");
  }

  public static isSelf(senderId, botUserId): boolean {
    return senderId === botUserId;
  }
}
