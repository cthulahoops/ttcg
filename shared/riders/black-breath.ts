import type { ObjectiveCard, ObjectiveStatus } from "../types";
import type { Game } from "../game";
import type { Seat } from "../seat";
import type { RiderDefinition } from "./types";

function getWonEights(seat: Seat): ObjectiveCard[] {
  return seat.getAllWonCards().filter((card) => card.value === 8);
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

      if (game.finished) {
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
