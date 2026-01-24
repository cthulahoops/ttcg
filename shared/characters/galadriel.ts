import type { Seat } from "../seat";
import type { ObjectiveCard, ObjectiveStatus } from "../types";
import type { CharacterDefinition } from "./types";

export const Galadriel: CharacterDefinition = {
  name: "Galadriel",
  setupText: "Exchange with either the lost card or Gandalf",

  setup: async (game, seat, setupContext) => {
    const gandalfInPlay = game.seats.some(
      (s) => s.character?.name === "Gandalf"
    );
    const lostCardExists = game.lostCard !== null;

    // If Gandalf is in play, exchange is required (choose Gandalf or lost card if available)
    if (gandalfInPlay) {
      const options = ["Gandalf"];
      if (lostCardExists) {
        options.push("Lost Card");
      }

      const choice = await game.choice(seat, "Exchange with?", options);

      if (choice === "Lost Card") {
        await game.exchangeWithLostCard(seat, setupContext);
      } else {
        await game.exchange(seat, setupContext, (c: string) => c === "Gandalf");
      }
      return;
    }

    // Gandalf not in play - lost card exchange is optional
    if (lostCardExists) {
      const choice = await game.choice(seat, "Exchange with?", [
        "Lost Card",
        "Skip",
      ]);

      if (choice === "Lost Card") {
        await game.exchangeWithLostCard(seat, setupContext);
      }
    }
  },

  objective: {
    text: "Win neither the fewest nor the most tricks",

    getStatus: (game, seat): ObjectiveStatus => {
      const allCounts = game.seats.map((s: Seat) => s.getTrickCount());
      const minCount = Math.min(...allCounts);
      const maxCount = Math.max(...allCounts);
      const myCount = seat.getTrickCount();
      const met = myCount !== minCount && myCount !== maxCount;

      // Check completability
      // Optimistic assumption: currentMin stays finalMin
      // Galadriel needs to be at least currentMin + 1
      const targetGaladriel = Math.max(minCount + 1, myCount);

      // Someone needs to be above Galadriel for max
      const targetMax = Math.max(maxCount, targetGaladriel + 1);

      // Calculate tricks needed to reach this state
      const tricksNeededForGaladriel = targetGaladriel - myCount;
      const tricksNeededForMax = targetMax - maxCount;
      const completable =
        tricksNeededForGaladriel + tricksNeededForMax <= game.tricksRemaining();

      // Check for early completion
      const tricksRemaining = game.tricksRemaining();
      const otherCounts = game.seats
        .filter((s: Seat) => s.seatIndex !== seat.seatIndex)
        .map((s: Seat) => s.getTrickCount());

      // Find players strictly below and above Galadriel
      const playersBelow = otherCounts.filter((c) => c < myCount);
      const playersAbove = otherCounts.filter((c) => c > myCount);

      let earlyComplete = false;
      if (playersBelow.length > 0 && playersAbove.length > 0) {
        // Guaranteed not fewest: even the highest player below can't catch up
        const maxBelow = Math.max(...playersBelow);
        const guaranteedNotFewest = maxBelow + tricksRemaining < myCount;

        // Guaranteed not most: even if Galadriel wins all remaining, can't exceed min above
        const minAbove = Math.min(...playersAbove);
        const guaranteedNotMost = myCount + tricksRemaining < minAbove;

        earlyComplete = guaranteedNotFewest && guaranteedNotMost;
      }

      if (game.finished) {
        return {
          finality: "final",
          outcome: met ? "success" : "failure",
        };
      }

      if (earlyComplete && met) {
        return { finality: "final", outcome: "success" };
      }

      if (!completable) {
        return { finality: "final", outcome: "failure" };
      }

      return {
        finality: "tentative",
        outcome: met ? "success" : "failure",
      };
    },
  },

  display: {
    getObjectiveCards: (_game, seat) => {
      const cards: ObjectiveCard[] = Array(seat.getTrickCount()).fill("trick");
      return { cards };
    },
  },
};
