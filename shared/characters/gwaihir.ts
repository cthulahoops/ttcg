import {
  CARDS_PER_SUIT,
  type Card,
  type ObjectiveCard,
  type ObjectiveStatus,
} from "../types";
import type { Seat } from "../seat";
import type { Game } from "../game";
import type { CharacterDefinition } from "./types";

const countMountainTricks = (seat: Seat) =>
  seat.tricksWon.filter((trick) =>
    trick.cards.some((c: Card) => c.suit === "mountains")
  ).length;

const countMountainsInPlay = (game: Game) => {
  const mountainsWon = game.seats.reduce(
    (count, s) =>
      count +
      s.tricksWon.reduce(
        (tc, trick) =>
          tc + trick.cards.filter((c: Card) => c.suit === "mountains").length,
        0
      ),
    0
  );
  return CARDS_PER_SUIT.mountains - mountainsWon;
};

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
      const mountainTricks = countMountainTricks(seat);
      const met = mountainTricks >= 2;

      if (met) {
        return { finality: "final", outcome: "success" };
      }

      const completable = mountainTricks + countMountainsInPlay(game) >= 2;

      if (!completable || game.finished) {
        return { finality: "final", outcome: "failure" };
      }

      return { finality: "tentative", outcome: "failure" };
    },

    getDetails: (_game, seat): string => {
      return `Tricks with mountains: ${countMountainTricks(seat)}/2`;
    },
  },

  display: {
    getObjectiveCards: (_game, seat) => {
      // Show trick markers for tricks containing mountain cards
      const cards: ObjectiveCard[] = Array(countMountainTricks(seat)).fill(
        "trick"
      );
      return { cards };
    },
  },
};
