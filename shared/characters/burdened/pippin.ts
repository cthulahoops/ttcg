import type { Seat } from "../../seat";
import type { ObjectiveCard, ObjectiveStatus } from "../../types";
import type { CharacterDefinition } from "../types";
import {
  tricksWinnable,
  achieveExactly,
  achieveAtLeast,
  achieveBoth,
  achieveEvery,
} from "../../objectives";

export const PippinBurdened: CharacterDefinition = {
  name: "Pippin (Burdened)",
  setupText: "Exchange with anyone",

  setup: async (game, seat, setupContext) => {
    await game.exchange(seat, setupContext, () => true);
  },

  objective: {
    text: "Win no tricks; all others win at least 1",

    getStatus: (game, seat): ObjectiveStatus => {
      const myTricks = tricksWinnable(game, seat);
      const winNoTricks = achieveExactly(myTricks, 0);

      const othersWinAtLeastOne = achieveEvery(
        game.seats
          .filter((s: Seat) => s.seatIndex !== seat.seatIndex)
          .map((s: Seat) => achieveAtLeast(tricksWinnable(game, s), 1))
      );

      return achieveBoth(winNoTricks, othersWinAtLeastOne);
    },

    cards: (_game, seat) => {
      const cards: ObjectiveCard[] = Array(seat.getTrickCount()).fill("trick");
      return { cards };
    },
  },
};
