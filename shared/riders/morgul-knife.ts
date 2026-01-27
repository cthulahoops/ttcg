import type { ObjectiveStatus } from "../types";
import type { Game } from "../game";
import type { Seat } from "../seat";
import type { RiderDefinition } from "./types";
import { allSuitCardsPlayed, hasLeadWithSuit } from "./helpers";

export const MorgulKnife: RiderDefinition = {
  name: "Morgul-Knife",
  objective: {
    text: "Do not lead with a ring card",
    getStatus: (game: Game, seat: Seat): ObjectiveStatus => {
      const violated = hasLeadWithSuit(game, seat, "rings");

      if (violated) {
        return { finality: "final", outcome: "failure" };
      }

      if (game.finished || allSuitCardsPlayed(game, "rings")) {
        return { finality: "final", outcome: "success" };
      }

      return { finality: "tentative", outcome: "success" };
    },
  },
  display: {},
};
