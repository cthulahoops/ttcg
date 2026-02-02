import type { ObjectiveCard, ObjectiveStatus } from "../types";
import type { CharacterDefinition } from "./types";
import { achieveAtLeast, tricksWinnable } from "../objectives";

export const BarlimanButterbur: CharacterDefinition = {
  name: "Barliman Butterbur",
  setupText: "Exchange with any player",

  setup: async (game, seat, setupContext) => {
    await game.exchange(seat, setupContext, (_c: string) => true); // Any player
  },

  objective: {
    text: "Win at least one of the last three tricks",

    getStatus: (game, seat): ObjectiveStatus => {
      const lastThreeTricks = tricksWinnable(
        game,
        seat,
        (t) => t.number >= game.tricksToPlay - 3
      );
      return achieveAtLeast(lastThreeTricks, 1);
    },

    cards: (game, seat) => {
      const tricksWon = seat.tricksWon.filter(
        (t) => t.number >= game.tricksToPlay - 3
      ).length;
      const cards: ObjectiveCard[] = Array(tricksWon).fill("trick");
      return { cards };
    },
  },
};
