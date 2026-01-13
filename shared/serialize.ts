// ===== SERIALIZATION FUNCTIONS =====
// Functions to serialize game state for network transmission.
// This is the single place to control what data is sent to clients
// and to implement information hiding/filtering.

import type { Game, TrickPlay, CompletedTrick } from "./game";
import type { Seat } from "./seat";
import { characterRegistry } from "./characters/registry";
import type {
  SerializedGame,
  SerializedSeat,
  SerializedTrickPlay,
  SerializedCompletedTrick,
} from "./serialized";

/**
 * Serialize a Seat for a specific viewing seat.
 * @param seat - The seat to serialize
 * @param viewingSeatIndex - The seat index of the viewer (to control visibility)
 * @returns Serialized seat data
 */
function serializeSeat(game: Game, seat: Seat, viewingSeatIndex: number): SerializedSeat {
  const isOwnSeat = seat.seatIndex === viewingSeatIndex;

  const objective = seat.characterDef?.objective.text
    ?? seat.characterDef?.objective.getText?.(game)
    ?? "";

  return {
    seatIndex: seat.seatIndex,
    playerName: seat.controller.playerName,
    character: seat.character,
    threatCard: seat.threatCard,
    tricksWon: seat.tricksWon,
    playedCards: seat.playedCards,
    status: seat.characterDef?.display.renderStatus(game, seat),
    objective,
    hand: seat.hand ? seat.hand.serializeForViewer(isOwnSeat) : null,
  };
}

/**
 * Serialize a TrickPlay to reduce payload size and avoid hand leakage.
 * @param trickPlay - The trick play to serialize
 * @returns Serialized trick play
 */
function serializeTrickPlay(trickPlay: TrickPlay): SerializedTrickPlay {
  return {
    seatIndex: trickPlay.playerIndex,
    card: trickPlay.card,
    isTrump: trickPlay.isTrump,
  };
}

/**
 * Serialize a CompletedTrick.
 * @param completedTrick - The completed trick to serialize
 * @returns Serialized completed trick
 */
function serializeCompletedTrick(
  completedTrick: CompletedTrick,
): SerializedCompletedTrick {
  return {
    plays: completedTrick.plays.map(serializeTrickPlay),
    winner: completedTrick.winner,
  };
}

/**
 * Serialize the entire game state for a specific seat.
 * This is the main entry point for serialization.
 *
 * @param game - The game instance to serialize
 * @param seatIndex - The seat index of the viewer (controls what information is visible)
 * @returns Serialized game state suitable for network transmission
 */
export function serializeGameForSeat(
  game: Game,
  seatIndex: number,
): SerializedGame {
  return {
    playerCount: game.playerCount,
    numCharacters: game.numCharacters,
    seats: game.seats.map((seat) => serializeSeat(game, seat, seatIndex)),
    currentTrick: game.currentTrick.map(serializeTrickPlay),
    completedTricks: game.completedTricks.map(serializeCompletedTrick),
    currentPlayer: game.currentPlayer,
    leadPlayer: game.leadPlayer,
    currentTrickNumber: game.currentTrickNumber,
    leadSuit: game.leadSuit,
    ringsBroken: game.ringsBroken,
    availableCharacters: game.availableCharacters.map((name) => {
      const def = characterRegistry.get(name);
      const objective = def?.objective.text ?? def?.objective.getText?.(game) ?? "";
      return {
        name,
        objective,
        setupText: def?.setupText ?? "",
      };
    }),
    lostCard: game.lostCard,
    lastTrickWinner: game.lastTrickWinner,
    tricksToPlay: game.tricksToPlay,
  };
}
