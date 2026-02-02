import type { Game } from "../game";
import type { Seat } from "../seat";
import type { RiderDefinition } from "./types";
import { leadsWinnable, achieveExactly } from "../objectives";

export const MorgulKnife: RiderDefinition = {
  name: "Morgul-Knife",
  objective: {
    text: "Do not lead with a ring card",
    getStatus: (game: Game, seat: Seat) => {
      const ringLeads = leadsWinnable(game, seat, (c) => c.suit === "rings");
      return achieveExactly(ringLeads, 0);
    },
  },
};
