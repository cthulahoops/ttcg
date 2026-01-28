import type { ObjectiveCard, ObjectiveStatus } from "../types";
import type { CharacterDefinition } from "./types";
import { tricksWinnable, achieveAtLeast } from "shared/objectives";

export const Gandalf: CharacterDefinition = {
  name: "Gandalf",
  setupText: "Take the lost card, then exchange with Frodo",

  setup: async (game, seat, setupContext) => {
    await game.takeLostCard(seat);
    await game.exchange(seat, setupContext, (c: string) => c === "Frodo");
  },

  objective: {
    text: "Win at least one trick",

    getStatus: (game, seat): ObjectiveStatus => {
      const tricks = tricksWinnable(game, seat);
      return achieveAtLeast(tricks, 1);
    },
  },

  display: {
    getObjectiveCards: (_game, seat) => {
      const cards: ObjectiveCard[] = Array(seat.getTrickCount()).fill("trick");
      return { cards };
    },
  },
};
