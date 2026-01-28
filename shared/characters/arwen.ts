import { type Card, type ObjectiveStatus } from "../types";
import type { Seat } from "shared/seat";
import type { Game } from "shared/game";
import type { CharacterDefinition } from "./types";
import {
  cardsWinnable,
  achieveEvery,
  achieveMoreThan,
  type ObjectivePossibilities,
} from "shared/objectives";

const countForestsWon = (seat: Seat) =>
  seat.getAllWonCards().filter((c: Card) => c.suit === "forests").length;

const forestCardsWinnable = (game: Game, seat: Seat) =>
  cardsWinnable(game, seat, (c: Card) => c.suit === "forests");

export const Arwen: CharacterDefinition = {
  name: "Arwen",
  setupText: "Exchange with Elrond or Aragorn",

  setup: async (game, seat, setupContext) => {
    await game.exchange(seat, setupContext, (c: string) =>
      ["Elrond", "Aragorn"].includes(c)
    );
  },

  objective: {
    text: "Win the most forests cards",

    getStatus: (game, seat): ObjectiveStatus => {
      const myForests = forestCardsWinnable(game, seat);

      const othersForests = game.seats
        .filter((s: Seat) => seat.seatIndex != s.seatIndex)
        .map((seat) => forestCardsWinnable(game, seat));

      return achieveEvery(
        othersForests.map((other: ObjectivePossibilities) =>
          achieveMoreThan(myForests, other)
        )
      );
    },

    getDetails: (_game, seat): string => {
      return `Forests: ${countForestsWon(seat)}`;
    },
  },

  display: {
    getObjectiveCards: (_game, seat) => {
      const cards = seat
        .getAllWonCards()
        .filter((c: Card) => c.suit === "forests")
        .sort((a, b) => a.value - b.value);
      return { cards };
    },
  },
};
