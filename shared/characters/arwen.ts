import { CARDS_PER_SUIT, type Card, type ObjectiveStatus } from "../types";
import type { Seat } from "../seat";
import type { CharacterDefinition } from "./types";

const countForestsWon = (seat: Seat) =>
  seat.getAllWonCards().filter((c: Card) => c.suit === "forests").length;

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
      const myCount = countForestsWon(seat);

      // Check if this seat has strictly more than all others
      const met = game.seats.every((s: Seat) => {
        if (s.seatIndex === seat.seatIndex) return true;
        return myCount > countForestsWon(s);
      });

      // Calculate completability
      const othersMaxCounts = Math.max(
        ...game.seats
          .filter((s: Seat) => s.seatIndex !== seat.seatIndex)
          .map((s: Seat) => countForestsWon(s))
      );

      const totalForestsWon = game.seats.reduce(
        (total: number, s: Seat) => total + countForestsWon(s),
        0
      );
      const forestsRemaining = CARDS_PER_SUIT.forests - totalForestsWon;

      const completable = myCount + forestsRemaining > othersMaxCounts;

      // Check for early completion: guaranteed to have the most forests
      const othersMax = Math.max(
        ...game.seats
          .filter((s: Seat) => s.seatIndex !== seat.seatIndex)
          .map((s: Seat) => countForestsWon(s) + forestsRemaining)
      );
      const earlyComplete = myCount > othersMax;

      if (earlyComplete || (game.finished && met)) {
        return { finality: "final", outcome: "success" };
      }

      if (!completable || (game.finished && !met)) {
        return { finality: "final", outcome: "failure" };
      }

      return {
        finality: "tentative",
        outcome: met ? "success" : "failure",
      };
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
