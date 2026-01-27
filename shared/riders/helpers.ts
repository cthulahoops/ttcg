import type { Game } from "../game";
import type { Seat } from "../seat";
import { CARDS_PER_SUIT, type Card, type Suit } from "../types";

export function hasLeadWithSuit(game: Game, seat: Seat, suit: Suit): boolean {
  // Check completed tricks
  for (const trick of game.completedTricks) {
    const leadPlay = trick.plays[0];
    if (
      leadPlay &&
      leadPlay.playerIndex === seat.seatIndex &&
      leadPlay.card.suit === suit
    ) {
      return true;
    }
  }

  // Check current trick (if this seat led it)
  if (game.currentTrick.length > 0) {
    const leadPlay = game.currentTrick[0];
    if (
      leadPlay &&
      leadPlay.playerIndex === seat.seatIndex &&
      leadPlay.card.suit === suit
    ) {
      return true;
    }
  }

  return false;
}

export function allSuitCardsPlayed(game: Game, suit: Suit): boolean {
  let totalWon = 0;
  for (const s of game.seats) {
    totalWon += s.getAllWonCards().filter((c: Card) => c.suit === suit).length;
  }
  const lostCardCount = game.lostCard?.suit === suit ? 1 : 0;
  return totalWon + lostCardCount === CARDS_PER_SUIT[suit];
}
