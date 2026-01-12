// shared/protocol.ts

// Player info shared between client and server
export interface Player {
  playerId: string;
  name: string;
  connected: boolean;
}

// Client → Server messages
export type ClientMessage =
  | { type: "ping" }
  | { type: "create_room"; playerName: string }
  | { type: "join_room"; roomCode: string; playerName: string }
  | { type: "leave_room" };

// Server → Client messages
export type ServerMessage =
  | { type: "pong" }
  | { type: "room_created"; roomCode: string; playerId: string }
  | { type: "room_joined"; roomCode: string; playerId: string; players: Player[] }
  | { type: "player_joined"; player: Player }
  | { type: "player_left"; playerId: string }
  | { type: "error"; message: string };
