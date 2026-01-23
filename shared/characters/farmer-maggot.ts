import type { Suit, ObjectiveCard, Card, ObjectiveStatus } from "../types";
import type { CharacterDefinition } from "./types";

export const FarmerMaggot: CharacterDefinition = {
  name: "Farmer Maggot",
  setupText: "Draw a threat card, then exchange with Merry or Pippin",

  setup: async (game, seat, setupContext) => {
    await game.drawThreatCard(seat);
    await game.exchange(seat, setupContext, (c: string) =>
      ["Merry", "Pippin"].includes(c)
    );
  },

  objective: {
    text: "Win at least two cards matching the threat card rank",

    getStatus: (game, seat): ObjectiveStatus => {
      if (!seat.threatCard) {
        return { finality: "tentative", outcome: "failure" };
      }

      const matchingWon = seat
        .getAllWonCards()
        .filter((c) => c.value === seat.threatCard).length;

      const met = matchingWon >= 2;

      // Check completability: count how many matching cards are still available
      let matchingAvailable = 0;
      const suits: Suit[] = [
        "mountains",
        "shadows",
        "forests",
        "hills",
        "rings",
      ];

      for (const suit of suits) {
        const maxValue = suit === "rings" ? 5 : 8;
        if (seat.threatCard <= maxValue) {
          if (!game.cardGone(seat, suit, seat.threatCard)) {
            matchingAvailable++;
          }
        }
      }

      const completable = matchingWon + matchingAvailable >= 2;

      if (met) {
        return { finality: "final", outcome: "success" };
      }

      if (!completable) {
        return { finality: "final", outcome: "failure" };
      }

      return { finality: "tentative", outcome: "failure" };
    },

    getDetails: (_game, seat): string | undefined => {
      if (!seat.threatCard) return undefined;

      const matchingCards = seat
        .getAllWonCards()
        .filter((c) => c.value === seat.threatCard);

      return `Threat: ${seat.threatCard}, Won: ${matchingCards.length}/2`;
    },
  },

  display: {
    getObjectiveCards: (_game, seat) => {
      const cards: ObjectiveCard[] = [];
      if (seat.threatCard !== null) {
        cards.push({ suit: "threat", value: seat.threatCard });
        const matchingCards = seat
          .getAllWonCards()
          .filter((c: Card) => c.value === seat.threatCard);
        cards.push(...matchingCards);
      }
      return { cards };
    },
  },
};
