import type { ObjectiveStatus } from "../types";
import type { Game } from "../game";
import type { Seat } from "../seat";
import type { RiderDefinition } from "./types";

function hasLeadWithSuit(game: Game, seat: Seat, suit: string): boolean {
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

export const Terror: RiderDefinition = {
  name: "Terror",
  objective: {
    text: "Do not lead with a hills card",
    getStatus: (game: Game, seat: Seat): ObjectiveStatus => {
      const violated = hasLeadWithSuit(game, seat, "hills");

      if (violated) {
        return { finality: "final", outcome: "failure" };
      }

      if (game.finished) {
        return { finality: "final", outcome: "success" };
      }

      return { finality: "tentative", outcome: "success" };
    },
  },
  display: {},
};
