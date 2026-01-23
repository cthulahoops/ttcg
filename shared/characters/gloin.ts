import { CARDS_PER_SUIT, type Card, type ObjectiveStatus } from "../types";
import type { Seat } from "../seat";
import type { CharacterDefinition } from "./types";

const countMountainsWon = (seat: Seat) =>
  seat.getAllWonCards().filter((c: Card) => c.suit === "mountains").length;

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
      const myCount = countMountainsWon(seat);

      // Check if this seat has strictly more than all others (met)
      const met = game.seats.every((s: Seat) => {
        if (s.seatIndex === seat.seatIndex) return true;
        return myCount > countMountainsWon(s);
      });

      const othersMaxCounts = Math.max(
        ...game.seats
          .filter((s: Seat) => s.seatIndex !== seat.seatIndex)
          .map((s: Seat) => countMountainsWon(s))
      );

      const totalMountainsWon = game.seats.reduce(
        (total: number, s: Seat) => total + countMountainsWon(s),
        0
      );
      const mountainsRemaining = CARDS_PER_SUIT.mountains - totalMountainsWon;

      const completable = myCount + mountainsRemaining > othersMaxCounts;

      // Check for early completion: guaranteed to have most mountains
      // Calculate the maximum mountains any other player could end up with
      const othersMax = Math.max(
        ...game.seats
          .filter((s: Seat) => s.seatIndex !== seat.seatIndex)
          .map((s: Seat) => countMountainsWon(s) + mountainsRemaining)
      );
      // Guaranteed most if our current count exceeds their max possible
      const completed = game.finished ? met : myCount > othersMax;

      if (completed && met) {
        return { finality: "final", outcome: "success" };
      } else if (!completable) {
        return { finality: "final", outcome: "failure" };
      } else {
        return {
          finality: "tentative",
          outcome: met ? "success" : "failure",
        };
      }
    },

    getDetails: (_game, seat): string => {
      return `Mountains: ${countMountainsWon(seat)}`;
    },
  },

  display: {
    getObjectiveCards: (_game, seat) => {
      const cards = seat
        .getAllWonCards()
        .filter((c: Card) => c.suit === "mountains")
        .sort((a, b) => a.value - b.value);
      return { cards };
    },
  },
};
