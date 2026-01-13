import type { Player, DecisionRequest } from "@shared/protocol";
import type { SerializedGame } from "@shared/serialized";

export type GameLogEntry = {
  line: string;
  important: boolean;
};

export type ClientState = {
  connected: boolean;

  roomCode: string | null;
  playerId: string | null;
  players: Player[];

  gameState: SerializedGame | null;
  gameLog: GameLogEntry[];

  pendingDecision: {
    requestId: string;
    decision: DecisionRequest;
  } | null;

  error: string | null;
};
