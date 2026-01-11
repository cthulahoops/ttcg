// shared/protocol.ts
export type ClientMessage =
  | { type: "ping" };

export type ServerMessage =
  | { type: "pong" };
