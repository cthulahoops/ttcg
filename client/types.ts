import type { Player } from "@shared/protocol";
import type { SerializedGame } from "@shared/serialized";

export type ClientState = {
  connected: boolean;

  roomCode: string | null;
  playerId: string | null;
  players: Player[];

  gameState: SerializedGame | null;

  error: string | null;
};
