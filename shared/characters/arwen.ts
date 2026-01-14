import type { Card } from "../types";
import type { Seat } from "../seat";
import type { CharacterDefinition } from "./types";

export const Arwen: CharacterDefinition = {
  name: "Arwen",
  setupText: "Exchange with Elrond or Aragorn",

  setup: async (game, seat, setupContext) => {
    await game.exchange(seat, setupContext, (c: string) =>
      ["Elrond", "Aragorn"].includes(c),
    );
  },

  objective: {
    text: "Win the most forests cards",
    check: (game, seat) => {
      const myCounts = seat
        .getAllWonCards()
        .filter((c: Card) => c.suit === "forests").length;

      // Check if this seat has strictly more than all others
      return game.seats.every((s: Seat) => {
        if (s.seatIndex === seat.seatIndex) return true;
        const theirCounts = s
          .getAllWonCards()
          .filter((c: Card) => c.suit === "forests").length;
        return myCounts > theirCounts;
      });
    },
    isCompletable: (game, seat) => {
      const myCounts = seat
        .getAllWonCards()
        .filter((c: Card) => c.suit === "forests").length;

      const othersMaxCounts = Math.max(
        ...game.seats
          .filter((s: Seat) => s.seatIndex !== seat.seatIndex)
          .map(
            (s: Seat) =>
              s.getAllWonCards().filter((c: Card) => c.suit === "forests")
                .length,
          ),
      );

      const totalForestsWon = game.seats.reduce(
        (total: number, s: Seat) =>
          total +
          s.getAllWonCards().filter((c: Card) => c.suit === "forests").length,
        0,
      );
      const forestsRemaining = 8 - totalForestsWon;

      return myCounts + forestsRemaining > othersMaxCounts;
    },
  },

  display: {
    renderStatus: (game, seat) => {
      const myCounts = seat
        .getAllWonCards()
        .filter((c: Card) => c.suit === "forests").length;
      const met = Arwen.objective.check(game, seat);
      const completable = Arwen.objective.isCompletable(game, seat);

      return {
        met,
        completable,
        details: `Forests: ${myCounts}`,
      };
    },
  },
};
