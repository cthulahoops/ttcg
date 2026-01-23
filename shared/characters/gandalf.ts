import type { ObjectiveCard, ObjectiveStatus } from "../types";
import type { CharacterDefinition } from "./types";

export const Gandalf: CharacterDefinition = {
  name: "Gandalf",
  setupText: "Take the lost card, then exchange with Frodo",

  setup: async (game, seat, setupContext) => {
    await game.takeLostCard(seat);
    await game.exchange(seat, setupContext, (c: string) => c === "Frodo");
  },

  objective: {
    text: "Win at least one trick",

    getStatus: (_game, seat): ObjectiveStatus => {
      const hasTrick = seat.getTrickCount() >= 1;
      return hasTrick
        ? { finality: "final", outcome: "success" }
        : { finality: "tentative", outcome: "failure" };
    },
  },

  display: {
    getObjectiveCards: (_game, seat) => {
      const cards: ObjectiveCard[] = Array(seat.getTrickCount()).fill("trick");
      return { cards };
    },
  },
};
