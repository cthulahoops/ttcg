import { CARDS_PER_SUIT, type Card } from "../types";
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
    check: (game, seat) => {
      const myCounts = countForestsWon(seat);

      // Check if this seat has strictly more than all others
      return game.seats.every((s: Seat) => {
        if (s.seatIndex === seat.seatIndex) return true;
        return myCounts > countForestsWon(s);
      });
    },
    isCompletable: (game, seat) => {
      const myCounts = countForestsWon(seat);

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

      return myCounts + forestsRemaining > othersMaxCounts;
    },
    isCompleted: (game, seat) =>
      game.finished && Arwen.objective.check(game, seat),
  },

  display: {
    renderStatus: (game, seat) => {
      const met = Arwen.objective.check(game, seat);
      const completable = Arwen.objective.isCompletable(game, seat);
      const completed = Arwen.objective.isCompleted(game, seat);

      return {
        met,
        completable,
        completed,
        details: `Forests: ${countForestsWon(seat)}`,
      };
    },
    getObjectiveCards: (_game, seat) => {
      const cards = seat
        .getAllWonCards()
        .filter((c: Card) => c.suit === "forests")
        .sort((a, b) => a.value - b.value);
      return { cards };
    },
  },
};
