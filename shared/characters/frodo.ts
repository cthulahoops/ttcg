import type { Card } from "../types";
import type { Seat } from "../seat";
import type { CharacterDefinition } from "./types";

export const Frodo: CharacterDefinition = {
  name: "Frodo",
  setupText: "No setup action",

  setup: async (_game, _seat, _setupContext) => {},

  objective: {
    getText: (game) => {
      const needed = game.numCharacters === 3 ? "four" : "two";
      return `Win at least ${needed} ring cards`;
    },
    check: (game, seat) => {
      const ringsNeeded = game.numCharacters === 3 ? 4 : 2;
      const ringCards = seat
        .getAllWonCards()
        .filter((c: Card) => c.suit === "rings");
      return ringCards.length >= ringsNeeded;
    },
    isCompletable: (game, seat) => {
      const ringsNeeded = game.numCharacters === 3 ? 4 : 2;
      const myRings = seat
        .getAllWonCards()
        .filter((c: Card) => c.suit === "rings").length;
      const othersRings = game.seats.reduce((total: number, s: Seat) => {
        if (s.seatIndex !== seat.seatIndex) {
          return (
            total +
            s.getAllWonCards().filter((c: Card) => c.suit === "rings").length
          );
        }
        return total;
      }, 0);
      const ringsRemaining = 5 - myRings - othersRings;
      return myRings + ringsRemaining >= ringsNeeded;
    },
    isCompleted: (game, seat) => Frodo.objective.check(game, seat),
  },

  display: {
    renderStatus: (game, seat) => {
      const ringCards = seat
        .getAllWonCards()
        .filter((c: Card) => c.suit === "rings");
      const ringsNeeded = game.numCharacters === 3 ? 4 : 2;
      const met = ringCards.length >= ringsNeeded;
      const completable = Frodo.objective.isCompletable(game, seat);
      const completed = Frodo.objective.isCompleted(game, seat);

      let details: string;
      if (ringCards.length > 0) {
        const ringList = ringCards
          .map((c) => c.value)
          .sort((a: number, b: number) => a - b)
          .join(", ");
        details = `Rings: ${ringList}`;
      } else {
        details = "Rings: none";
      }

      return { met, completable, completed, details };
    },
  },
};
