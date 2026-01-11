// ===== SERIALIZATION FUNCTIONS =====
// Functions to serialize game state for network transmission.
// This is the single place to control what data is sent to clients
// and to implement information hiding/filtering.

import type { Game, TrickPlay } from "./game";
import type { Seat } from "./seat";
import type {
  SerializedGame,
  SerializedSeat,
  SerializedTrickPlay,
} from "./serialized";

/**
 * Serialize a Seat for a specific viewing seat.
 * @param seat - The seat to serialize
 * @param viewingSeatIndex - The seat index of the viewer (to control visibility)
 * @returns Serialized seat data
 */
function serializeSeat(seat: Seat, viewingSeatIndex: number): SerializedSeat {
  const isOwnSeat = seat.seatIndex === viewingSeatIndex;

  // For now, we don't filter hidden information yet
  // This will be the single place to add filtering later
  const visibleCards = isOwnSeat && seat.hand
    ? seat.hand.getAllCards()
    : undefined;

  return {
    seatIndex: seat.seatIndex,
    character: seat.character,
    threatCard: seat.threatCard,
    tricksWon: seat.tricksWon,
    playedCards: seat.playedCards,
    isPyramid: seat.isPyramid,
    handSize: seat.hand ? seat.hand.getSize() : 0,
    visibleCards,
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
    seats: game.seats.map((seat) => serializeSeat(seat, seatIndex)),
    currentTrick: game.currentTrick.map(serializeTrickPlay),
    currentPlayer: game.currentPlayer,
    currentTrickNumber: game.currentTrickNumber,
    leadSuit: game.leadSuit,
    ringsBroken: game.ringsBroken,
    availableCharacters: game.availableCharacters,
    lostCard: game.lostCard,
    lastTrickWinner: game.lastTrickWinner,
    // For now, expose full threat deck - can filter later
    threatDeck: game.threatDeck,
    tricksToPlay: game.tricksToPlay,
  };
}
