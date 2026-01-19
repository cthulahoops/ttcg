import { CARDS_PER_SUIT, type Card } from "../types";
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
    check: (game, seat) => {
      const myCounts = countMountainsWon(seat);

      // Check if this seat has strictly more than all others
      return game.seats.every((s: Seat) => {
        if (s.seatIndex === seat.seatIndex) return true;
        return myCounts > countMountainsWon(s);
      });
    },
    isCompletable: (game, seat) => {
      const myCounts = countMountainsWon(seat);

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

      return myCounts + mountainsRemaining > othersMaxCounts;
    },
    isCompleted: (game, seat) => {
      if (game.finished) {
        return Gloin.objective.check(game, seat);
      }
      // Early completion: check if guaranteed to have the most mountains
      const myCount = countMountainsWon(seat);

      const totalMountainsWon = game.seats.reduce(
        (total: number, s: Seat) => total + countMountainsWon(s),
        0
      );
      const mountainsRemaining = CARDS_PER_SUIT.mountains - totalMountainsWon;

      // Calculate the maximum mountains any other player could end up with
      const othersMax = Math.max(
        ...game.seats
          .filter((s: Seat) => s.seatIndex !== seat.seatIndex)
          .map((s: Seat) => countMountainsWon(s) + mountainsRemaining)
      );

      // Guaranteed most if our current count exceeds their max possible
      // Use strict > because ties don't count as "most"
      return myCount > othersMax;
    },
  },

  display: {
    renderStatus: (game, seat) => {
      const met = Gloin.objective.check(game, seat);
      const completable = Gloin.objective.isCompletable(game, seat);
      const completed = Gloin.objective.isCompleted(game, seat);

      return {
        met,
        completable,
        completed,
        details: `Mountains: ${countMountainsWon(seat)}`,
      };
    },
    getObjectiveCards: (_game, seat) => {
      const cards = seat
        .getAllWonCards()
        .filter((c: Card) => c.suit === "mountains")
        .sort((a, b) => a.value - b.value);
      return { cards };
    },
  },
};
