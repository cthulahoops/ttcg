import type { ObjectiveStatus } from "../types";
import type { Game } from "../game";
import type { Seat } from "../seat";
import type { RiderDefinition } from "./types";
import { hasLeadWithSuit } from "./helpers";

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
