import type { ObjectiveCard, ObjectiveStatus } from "../types";
import type { CharacterDefinition } from "./types";
import { tricksWinnable, achieveExactly } from "shared/objectives";

export const Aragorn: CharacterDefinition = {
  name: "Aragorn",
  setupText: "Choose a threat card, then exchange with Gimli or Legolas",

  setup: async (game, seat, setupContext) => {
    await game.chooseThreatCard(seat);
    await game.exchange(seat, setupContext, (c: string) =>
      ["Gimli", "Legolas"].includes(c)
    );
  },

  objective: {
    text: "Win exactly the number of tricks shown on your threat card",

    getStatus: (game, seat): ObjectiveStatus => {
      if (!seat.threatCard) {
        return { finality: "tentative", outcome: "failure" };
      }

      const tricks = tricksWinnable(game, seat);
      return achieveExactly(tricks, seat.threatCard);
    },

    cards: (_game, seat) => {
      const cards: ObjectiveCard[] = [];
      if (seat.threatCard !== null) {
        cards.push({ suit: "threat", value: seat.threatCard });
      }
      cards.push(...Array(seat.getTrickCount()).fill("trick"));
      return { cards };
    },
  },
};
