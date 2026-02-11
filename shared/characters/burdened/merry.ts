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
import { isOneOf } from "../character-utils";

export const MerryBurdened: CharacterDefinition = {
  name: "Merry (Burdened)",
  setupText:
    "Exchange with Frodo, Sam, or Pippin (all threat draws this round may be redrawn)",

  setup: async (game, seat, setupContext) => {
    await game.exchange(seat, setupContext, (c: string) =>
      isOneOf(c, ["Frodo", "Pippin", "Sam"])
    );
  },

  objective: {
    text: "Win exactly 2 tricks; all others win at least 1",

    getStatus: (game, seat): ObjectiveStatus => {
      const myTricks = tricksWinnable(game, seat);
      const winExactlyTwo = achieveExactly(myTricks, 2);

      const othersWinAtLeastOne = achieveEvery(
        game.seats
          .filter((s: Seat) => s.seatIndex !== seat.seatIndex)
          .map((s: Seat) => achieveAtLeast(tricksWinnable(game, s), 1))
      );

      return achieveBoth(winExactlyTwo, othersWinAtLeastOne);
    },

    cards: (_game, seat) => {
      const cards: ObjectiveCard[] = Array(seat.getTrickCount()).fill("trick");
      return { cards };
    },
  },
};
