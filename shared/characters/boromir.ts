import type { ObjectiveStatus } from "../types";
import type { CharacterDefinition } from "./types";
import {
  achieveAtLeast,
  achieveBoth,
  achieveCard,
  doNot,
  tricksWinnable,
} from "../objectives";
import { isCharacter } from "./character-utils";
import { BoromirBurdened } from "./burdened/boromir";

export const Boromir: CharacterDefinition = {
  name: "Boromir",
  burdened: BoromirBurdened,
  setupText: "Exchange with anyone except Frodo",

  setup: async (game, seat, setupContext) => {
    await game.exchange(
      seat,
      setupContext,
      (c: string) => !isCharacter(c, "Frodo")
    );
  },

  objective: {
    text: "Win the last trick; do NOT win the 1 of Rings",

    getStatus: (game, seat): ObjectiveStatus => {
      // Win the last trick (trick number is 0-indexed, so last trick is tricksToPlay - 1)
      const lastTrickIndex = game.tricksToPlay - 1;
      const lastTrick = tricksWinnable(
        game,
        seat,
        (trick) => trick.number === lastTrickIndex
      );
      const winLastTrick = achieveAtLeast(lastTrick, 1);

      // Do NOT win the 1 of Rings
      const avoidOneRing = doNot(
        achieveCard(game, seat, { suit: "rings", value: 1 })
      );

      return achieveBoth(winLastTrick, avoidOneRing);
    },
  },
};
