import type { ObjectiveStatus } from "../../types";
import type { CharacterDefinition } from "../types";
import {
  achieveAtLeast,
  achieveBoth,
  cardsWinnable,
  doNot,
  tricksWinnable,
} from "../../objectives";
import { isCharacter } from "../character-utils";

export const BoromirBurdened: CharacterDefinition = {
  name: "Boromir (Burdened)",
  setupText: "Exchange with anyone except Frodo",

  setup: async (game, seat, setupContext) => {
    await game.exchange(
      seat,
      setupContext,
      (c: string) => !isCharacter(c, "Frodo")
    );
  },

  objective: {
    text: "Win the last trick; do NOT win any ring cards",

    getStatus: (game, seat): ObjectiveStatus => {
      const lastTrickIndex = game.tricksToPlay - 1;
      const lastTrick = tricksWinnable(
        game,
        seat,
        (trick) => trick.number === lastTrickIndex
      );
      const winLastTrick = achieveAtLeast(lastTrick, 1);

      // Do NOT win ANY rings cards
      const avoidRings = doNot(
        achieveAtLeast(
          cardsWinnable(game, seat, (c) => c.suit === "rings"),
          1
        )
      );

      return achieveBoth(winLastTrick, avoidRings);
    },
  },
};
