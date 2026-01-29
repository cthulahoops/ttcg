import type { Game } from "../game";
import type { Seat } from "../seat";
import type { RiderDefinition } from "./types";
import { leadsWinnable, achieveExactly } from "../objectives";

export const Terror: RiderDefinition = {
  name: "Terror",
  objective: {
    text: "Do not lead with a hills card",
    getStatus: (game: Game, seat: Seat) => {
      const hillsLeads = leadsWinnable(game, seat, (c) => c.suit === "hills");
      return achieveExactly(hillsLeads, 0);
    },
  },
  display: {},
};
