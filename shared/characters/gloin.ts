import type { Card } from "../types";
import type { Seat } from "../seat";
import type { CharacterDefinition } from "./types";

export const Gloin: CharacterDefinition = {
  name: "Gloin",
  setupText: "Exchange with Bilbo or Gimli",

  setup: async (game, seat, setupContext) => {
    await game.exchange(seat, setupContext, (c: string) =>
      ["Bilbo Baggins", "Gimli"].includes(c),
    );
  },

  objective: {
    text: "Win the most mountains cards",
    check: (game, seat) => {
      const myCounts = seat
        .getAllWonCards()
        .filter((c: Card) => c.suit === "mountains").length;

      // Check if this seat has strictly more than all others
      return game.seats.every((s: Seat) => {
        if (s.seatIndex === seat.seatIndex) return true;
        const theirCounts = s
          .getAllWonCards()
          .filter((c: Card) => c.suit === "mountains").length;
        return myCounts > theirCounts;
      });
    },
    isCompletable: (game, seat) => {
      const myCounts = seat
        .getAllWonCards()
        .filter((c: Card) => c.suit === "mountains").length;

      const othersMaxCounts = Math.max(
        ...game.seats
          .filter((s: Seat) => s.seatIndex !== seat.seatIndex)
          .map(
            (s: Seat) =>
              s.getAllWonCards().filter((c: Card) => c.suit === "mountains")
                .length,
          ),
      );

      const totalMountainsWon = game.seats.reduce(
        (total: number, s: Seat) =>
          total +
          s.getAllWonCards().filter((c: Card) => c.suit === "mountains").length,
        0,
      );
      const mountainsRemaining = 8 - totalMountainsWon;

      return myCounts + mountainsRemaining > othersMaxCounts;
    },
  },

  display: {
    renderStatus: (game, seat) => {
      const myCounts = seat
        .getAllWonCards()
        .filter((c: Card) => c.suit === "mountains").length;
      const met = Gloin.objective.check(game, seat);
      const completable = Gloin.objective.isCompletable(game, seat);

      return {
        met,
        completable,
        details: `Mountains: ${myCounts}`,
      };
    },
  },
};
