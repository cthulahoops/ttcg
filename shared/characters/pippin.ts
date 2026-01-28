import type { Seat } from "../seat";
import type { ObjectiveCard, ObjectiveStatus } from "../types";
import type { CharacterDefinition } from "./types";
import {
  tricksWinnable,
  achieveAtLeast,
  achieveEvery,
} from "shared/objectives";

export const Pippin: CharacterDefinition = {
  name: "Pippin",
  setupText: "Exchange with Frodo, Merry, or Sam",

  setup: async (game, seat, setupContext) => {
    await game.exchange(seat, setupContext, (c: string) =>
      ["Frodo", "Merry", "Sam"].includes(c)
    );
  },

  objective: {
    text: "Win the fewest (or joint fewest) tricks",

    getStatus: (game, seat): ObjectiveStatus => {
      const myTricks = tricksWinnable(game, seat);

      // Pippin needs each other player to have at least as many tricks as him
      const othersTricks = game.seats
        .filter((s: Seat) => s.seatIndex !== seat.seatIndex)
        .map((s: Seat) => tricksWinnable(game, s));

      return achieveEvery(
        othersTricks.map((other) => achieveAtLeast(other, myTricks))
      );
    },
  },

  display: {
    getObjectiveCards: (_game, seat) => {
      const cards: ObjectiveCard[] = Array(seat.getTrickCount()).fill("trick");
      return { cards };
    },
  },
};
