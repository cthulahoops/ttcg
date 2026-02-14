// shared/protocol.ts

import type { SerializedGame } from "./serialized";
import type { AnyCard, Serializable, ChoiceButtonOptions } from "./types";

// Player info shared between client and server (public information only)
export interface Player {
  name: string;
  connected: boolean;
}

// Game mode options
export type GameMode = "short" | "long";

export interface GameOptions {
  mode: GameMode;
}

// Long game progress for client display
export interface LongGameProgress {
  currentRound: number;
  characterPool: string[]; // All character names in campaign
  completedCharacters: string[]; // Names of completed characters
  riderCompleted: boolean;
  campaignRiderName: string;
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
  | { type: "start_game"; options?: GameOptions }
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
  | {
      type: "game_reset";
      players: Player[];
      longGameProgress?: LongGameProgress;
    }; // Return to room lobby

// Decision request types
export type DecisionRequest =
  | {
      type: "choose_button";
      seatIndex?: number;
      options: ChoiceButtonOptions<Serializable>;
      publicMessage: string;
    }
  | {
      type: "select_card";
      seatIndex?: number;
      cards: AnyCard[];
      message?: string;
      publicMessage: string;
    }
  | {
      type: "select_seat";
      seatIndex: number;
      message: string;
      eligibleSeats: number[];
      buttonTemplate: string; // Use {seat} placeholder for seat label
      skipLabel?: string;
      publicMessage: string;
    }
  | {
      type: "select_character";
      seatIndex: number;
      message: string;
      publicMessage: string;
    };
