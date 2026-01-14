import type { Seat } from "../seat";
import type { CharacterDefinition } from "./types";

export const Galadriel: CharacterDefinition = {
  name: "Galadriel",
  setupText: "Exchange with either the lost card or Gandalf",

  setup: async (game, seat, setupContext) => {
    const choice = await game.choice(seat, "Exchange with?", [
      "Lost Card",
      "Gandalf",
    ]);

    if (choice === "Lost Card") {
      await game.exchangeWithLostCard(seat, setupContext);
    } else {
      await game.exchange(seat, setupContext, (c: string) => c === "Gandalf");
    }
  },

  objective: {
    text: "Win neither the fewest nor the most tricks",
    check: (game, seat) => {
      const allCounts = game.seats.map((s: Seat) => s.getTrickCount());
      const minCount = Math.min(...allCounts);
      const maxCount = Math.max(...allCounts);
      const myCount = seat.getTrickCount();
      return myCount !== minCount && myCount !== maxCount;
    },
    isCompletable: (game, seat) => {
      const allCounts = game.seats.map((s: Seat) => s.getTrickCount());
      const minCount = Math.min(...allCounts);
      const maxCount = Math.max(...allCounts);
      const myCount = seat.getTrickCount();

      // Optimistic assumption: currentMin stays finalMin
      // Galadriel needs to be at least currentMin + 1
      const targetGaladriel = Math.max(minCount + 1, myCount);

      // Someone needs to be above Galadriel for max
      const targetMax = Math.max(maxCount, targetGaladriel + 1);

      // Calculate tricks needed to reach this state
      const tricksNeededForGaladriel = targetGaladriel - myCount;
      const tricksNeededForMax = targetMax - maxCount;

      return (
        tricksNeededForGaladriel + tricksNeededForMax <= game.tricksRemaining()
      );
    },
    isCompleted: (game, seat) =>
      game.finished && Galadriel.objective.check(game, seat),
  },

  display: {
    renderStatus: (game, seat) => {
      const met = Galadriel.objective.check(game, seat);
      const completable = Galadriel.objective.isCompletable(game, seat);
      return game.displaySimple(met, completable);
    },
  },
};
