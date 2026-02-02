import type { ObjectiveCard, ObjectiveStatus } from "../types";
import type { Seat } from "../seat";
import type { Game } from "../game";
import type { CharacterDefinition } from "./types";
import { achieveAtLeast, tricksWithCardsWinnable } from "../objectives";

const mountainTricks = (game: Game, seat: Seat) =>
  tricksWithCardsWinnable(game, seat, (card) => card.suit === "mountains");

export const Gwaihir: CharacterDefinition = {
  name: "Gwaihir",
  setupText: "Exchange with Gandalf twice",

  setup: async (game, seat, setupContext) => {
    await game.exchange(seat, setupContext, (c: string) => c === "Gandalf");
    await game.exchange(seat, setupContext, (c: string) => c === "Gandalf");
  },

  objective: {
    text: "Win at least two tricks containing a mountain card",

    getStatus: (game, seat): ObjectiveStatus => {
      return achieveAtLeast(mountainTricks(game, seat), 2);
    },

    cards: (game, seat) => {
      const cards: ObjectiveCard[] = Array(
        mountainTricks(game, seat).current
      ).fill("trick");
      return { cards };
    },
  },
};
