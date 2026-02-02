// ===== SERIALIZATION FUNCTIONS =====
// Functions to serialize game state for network transmission.
// This is the single place to control what data is sent to clients
// and to implement information hiding/filtering.

import type { Game, TrickPlay, CompletedTrick } from "./game";
import type { Seat } from "./seat";
import type { Card } from "./types";
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
function serializeSeat(
  game: Game,
  seat: Seat,
  viewingSeatIndex: number
): SerializedSeat {
  const isOwnSeat = seat.seatIndex === viewingSeatIndex;

  const objective =
    seat.character?.objective.text ??
    seat.character?.objective.getText?.(game) ??
    "";

  // Aside card is visible if:
  // - It's the viewer's own seat, OR
  // - The seat's hand is revealed (Goldberry, Fatty Bolger, pyramid, solitaire)
  let asideCard: Card | "hidden" | null = null;
  if (seat.asideCard) {
    const handRevealed = seat.hand?.isRevealed() ?? false;
    asideCard = isOwnSeat || handRevealed ? seat.asideCard : "hidden";
  }

  const objectiveCards = seat.character?.objective.cards?.(game, seat);

  // Rider fields
  const riderObjective =
    seat.rider?.objective.text ?? seat.rider?.objective.getText?.(game) ?? null;
  const riderStatus = seat.rider
    ? seat.rider.objective.getStatus(game, seat)
    : undefined;
  const riderObjectiveCards = seat.rider?.objective.cards?.(game, seat);

  return {
    seatIndex: seat.seatIndex,
    playerName: seat.controller.playerName,
    character: seat.character?.name ?? null,
    setupText: seat.character?.setupText ?? null,
    threatCard: seat.threatCard,
    tricksWon: seat.tricksWon,
    playedCards: seat.playedCards,
    objectiveStatus: seat.character?.objective.getStatus(game, seat),
    statusDetails: seat.character?.objective.getDetails?.(game, seat),
    objective,
    hand: seat.hand ? seat.hand.serializeForViewer(isOwnSeat) : null,
    asideCard,
    objectiveCards,
    rider: seat.rider?.name ?? null,
    riderObjective,
    riderStatus,
    riderObjectiveCards,
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
  completedTrick: CompletedTrick
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
  seatIndex: number
): SerializedGame {
  return {
    playerCount: game.playerCount,
    numCharacters: game.numCharacters,
    viewerSeat: seatIndex,
    seats: game.seats.map((seat) => serializeSeat(game, seat, seatIndex)),
    currentTrick: game.currentTrick.map(serializeTrickPlay),
    completedTricks: game.completedTricks.map(serializeCompletedTrick),
    currentPlayer: game.currentPlayer,
    leadPlayer: game.leadPlayer,
    currentTrickNumber: game.currentTrickNumber,
    leadSuit: game.leadSuit,
    ringsBroken: game.ringsBroken,
    availableCharacters: game.availableCharacters.map((def) => {
      const objective =
        def.objective.text ?? def.objective.getText?.(game) ?? "";
      return {
        name: def.name,
        objective,
        setupText: def.setupText ?? "",
      };
    }),
    lostCard: game.lostCard,
    lastTrickWinner: game.lastTrickWinner,
    tricksToPlay: game.tricksToPlay,
    drawnRider: game.drawnRider
      ? {
          name: game.drawnRider.name,
          objective:
            game.drawnRider.objective.text ??
            game.drawnRider.objective.getText?.(game) ??
            "",
        }
      : null,
    phase: game.phase,
  };
}
