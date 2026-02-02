import { type Card, type ObjectiveStatus } from "../types";
import type { Seat } from "../seat";
import type { Game } from "../game";
import type { CharacterDefinition } from "./types";
import {
  cardsWinnable,
  achieveEvery,
  achieveMoreThan,
  type ObjectivePossibilities,
} from "../objectives";

const mountainCardsWinnable = (game: Game, seat: Seat) =>
  cardsWinnable(game, seat, (c: Card) => c.suit === "mountains");

export const Gloin: CharacterDefinition = {
  name: "Gloin",
  setupText: "Exchange with Bilbo or Gimli",

  setup: async (game, seat, setupContext) => {
    await game.exchange(seat, setupContext, (c: string) =>
      ["Bilbo Baggins", "Gimli"].includes(c)
    );
  },

  objective: {
    text: "Win the most mountains cards",

    getStatus: (game, seat): ObjectiveStatus => {
      const myMountains = mountainCardsWinnable(game, seat);

      const othersMountains = game.seats
        .filter((s: Seat) => seat.seatIndex != s.seatIndex)
        .map((s) => mountainCardsWinnable(game, s));

      return achieveEvery(
        othersMountains.map((other: ObjectivePossibilities) =>
          achieveMoreThan(myMountains, other)
        )
      );
    },

    cards: (_game, seat) => {
      const cards = seat
        .getAllWonCards()
        .filter((c: Card) => c.suit === "mountains")
        .sort((a, b) => a.value - b.value);
      return { cards };
    },
  },
};
