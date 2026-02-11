import type { ObjectiveCard, ObjectiveStatus } from "../types";
import type { CharacterDefinition } from "./types";
import { tricksWinnable, achieveRange } from "shared/objectives";
import { isOneOf } from "./character-utils";

export const Merry: CharacterDefinition = {
  name: "Merry",
  setupText: "Exchange with Frodo, Pippin, or Sam",

  setup: async (game, seat, setupContext) => {
    await game.exchange(seat, setupContext, (c: string) =>
      isOneOf(c, ["Frodo", "Pippin", "Sam"])
    );
  },

  objective: {
    text: "Win exactly one or two tricks",

    getStatus: (game, seat): ObjectiveStatus => {
      const tricks = tricksWinnable(game, seat);
      return achieveRange(tricks, { min: 1, max: 2 });
    },

    cards: (_game, seat) => {
      const cards: ObjectiveCard[] = Array(seat.getTrickCount()).fill("trick");
      return { cards };
    },
  },
};
