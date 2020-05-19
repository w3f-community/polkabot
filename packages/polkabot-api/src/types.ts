export type Cache = {
  [Key: string]: unknown;
}

export type CallableMetas = {
  name: string;
  alias: string;
}

export type MatrixEventType = 'm.room.encrypted' | 'm.room.message'