// shared/protocol.ts

import type { SerializedGame } from "./serialized";
import type {
  Card,
  AnyCard,
  ChoiceButtonOptions,
  ChoiceCardOptions,
} from "./types";

// Player info shared between client and server (public information only)
export interface Player {
  name: string;
  connected: boolean;
}

// Client → Server messages
export type ClientMessage =
  | { type: "ping" }
  | {
      type: "join_room";
      roomCode: string;
      playerName: string;
      playerId: string;
    }
  | { type: "leave_room" }
  | { type: "start_game" }
  | { type: "decision_response"; requestId: string; response: unknown };

// Server → Client messages
export type ServerMessage =
  | { type: "pong" }
  | {
      type: "room_joined";
      roomCode: string;
      playerId: string;
      players: Player[];
    } // playerId only for self
  | { type: "room_left"; roomCode: string; playerName: string }
  | { type: "player_joined"; player: Player }
  | { type: "player_left"; playerName: string } // Use name instead of ID
  | { type: "game_state"; state: SerializedGame }
  | { type: "game_log"; line: string; important?: boolean }
  | { type: "error"; message: string }
  | { type: "decision_request"; requestId: string; decision: DecisionRequest }
  | { type: "game_reset"; players: Player[] }; // Return to room lobby

// Decision request types
export type DecisionRequest =
  | { type: "choose_button"; options: ChoiceButtonOptions<string | number | boolean> }
  | { type: "choose_card"; options: ChoiceCardOptions<AnyCard> }
  | { type: "select_card"; availableCards: Card[] };
