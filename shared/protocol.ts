// shared/protocol.ts

import type { SerializedGame } from "./serialized";
import type { Card, AnyCard, ChoiceButtonOptions, ChoiceCardOptions } from "./types";

// Player info shared between client and server
export interface Player {
  playerId: string;
  name: string;
  connected: boolean;
}

// Client → Server messages
export type ClientMessage =
  | { type: "ping" }
  | { type: "join_room"; roomCode: string; playerName: string }
  | { type: "leave_room" }
  | { type: "start_game" }
  | { type: "decision_response"; requestId: string; response: any };

// Server → Client messages
export type ServerMessage =
  | { type: "pong" }
  | { type: "room_joined"; roomCode: string; playerId: string; players: Player[] }
  | { type: "player_joined"; player: Player }
  | { type: "player_left"; playerId: string }
  | { type: "game_started" }
  | { type: "game_state"; state: SerializedGame }
  | { type: "error"; message: string }
  | { type: "decision_request"; requestId: string; decision: DecisionRequest };

// Decision request types
export type DecisionRequest =
  | { type: "choose_button"; options: ChoiceButtonOptions<any> }
  | { type: "choose_card"; options: ChoiceCardOptions<AnyCard> }
  | { type: "select_card"; availableCards: Card[] };
