import type { ObjectiveCard, ObjectiveStatus, Suit } from "../types";
import type { Game } from "../game";
import type { Seat } from "../seat";
import type { RiderDefinition } from "./types";

const SUITS_WITH_EIGHTS: Suit[] = ["mountains", "shadows", "forests", "hills"];

function getWonEights(seat: Seat): ObjectiveCard[] {
  return seat.getAllWonCards().filter((card) => card.value === 8);
}

function isEightGone(game: Game, seat: Seat, suit: Suit): boolean {
  return (
    game.cardGone(seat, suit, 8) ||
    (game.lostCard?.suit === suit && game.lostCard?.value === 8)
  );
}

function allEightsGone(game: Game, seat: Seat): boolean {
  return SUITS_WITH_EIGHTS.every((suit) => isEightGone(game, seat, suit));
}

export const BlackBreath: RiderDefinition = {
  name: "The Black Breath",
  objective: {
    text: "Win no rank 8 cards",
    getStatus: (game: Game, seat: Seat): ObjectiveStatus => {
      const wonEights = getWonEights(seat);

      if (wonEights.length > 0) {
        return { finality: "final", outcome: "failure" };
      }

      if (game.finished || allEightsGone(game, seat)) {
        return { finality: "final", outcome: "success" };
      }

      return { finality: "tentative", outcome: "success" };
    },
  },
  display: {
    getObjectiveCards: (_game: Game, seat: Seat) => {
      const cards = getWonEights(seat);
      return { cards };
    },
  },
};
