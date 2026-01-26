import type { Game } from "../game";
import type { Seat } from "../seat";
import type { Suit } from "../types";

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
