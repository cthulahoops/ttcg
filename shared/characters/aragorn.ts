import type { ObjectiveCard, ObjectiveStatus } from "../types";
import type { CharacterDefinition } from "./types";
import { tricksWinnable, achieveExactly } from "shared/objectives";
import { isOneOf } from "./character-utils";
import { AragornBurdened } from "./burdened/aragorn";

export const Aragorn: CharacterDefinition = {
  name: "Aragorn",
  burdened: AragornBurdened,
  drawsThreatCard: true,
  setupText: "Choose a threat card, then exchange with Gimli or Legolas",

  setup: async (game, seat, setupContext) => {
    await game.chooseThreatCard(seat);
    await game.exchange(seat, setupContext, (c: string) =>
      isOneOf(c, ["Gimli", "Legolas"])
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
      cards.push(...Array(seat.getTrickCount()).fill("trick"));
      if (seat.threatCard !== null) {
        cards.push({ suit: "threat", value: seat.threatCard });
      }
      return { cards };
    },
  },
};
