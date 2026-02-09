// Long game state management

import type { CharacterDefinition } from "./characters/registry";
import type { RiderDefinition } from "./riders/types";
import type { LongGameProgress } from "./protocol";

// Server-side state for tracking a long game campaign
export interface LongGameState {
  characterPool: CharacterDefinition[]; // All characters for this long game
  completedCharacters: string[]; // Names of characters completed in successful rounds
  currentRound: number;
  riderCompleted: boolean; // Whether rider has been completed
  campaignRider: RiderDefinition; // Rider drawn once for the campaign
}

// Convert server state to client-safe progress
export function toLongGameProgress(state: LongGameState): LongGameProgress {
  return {
    currentRound: state.currentRound,
    characterPool: state.characterPool.map((c) => c.name),
    completedCharacters: state.completedCharacters,
    riderCompleted: state.riderCompleted,
    campaignRiderName: state.campaignRider.name,
  };
}
