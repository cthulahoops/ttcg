import type { Card, ObjectiveStatus } from "../types";
import type { CharacterDefinition } from "./types";

export const Celeborn: CharacterDefinition = {
  name: "Celeborn",
  setupText: "Exchange with any player",

  setup: async (game, seat, setupContext) => {
    await game.exchange(seat, setupContext, (_c: string) => true); // Any player
  },

  objective: {
    text: "Win at least three cards of the same rank",

    getStatus: (_game, seat): ObjectiveStatus => {
      const rankCounts: Record<number, number> = {};
      seat.getAllWonCards().forEach((card: Card) => {
        rankCounts[card.value] = (rankCounts[card.value] || 0) + 1;
      });
      const met = Object.values(rankCounts).some((count) => count >= 3);

      // Once met, it's final success. Otherwise tentative (hard to determine early failure)
      return met
        ? { finality: "final", outcome: "success" }
        : { finality: "tentative", outcome: "failure" };
    },

    getDetails: (_game, seat): string | undefined => {
      const rankCounts: Record<number, number> = {};
      seat.getAllWonCards().forEach((card: Card) => {
        rankCounts[card.value] = (rankCounts[card.value] || 0) + 1;
      });

      const ranksWithCounts = Object.entries(rankCounts)
        .filter(([_rank, count]) => count >= 2)
        .map(([rank, count]) => `${rank}:${count}`)
        .join(", ");

      return ranksWithCounts || undefined;
    },
  },

  display: {
    getObjectiveCards: (_game, seat) => {
      const rankCounts: Record<number, Card[]> = {};
      seat.getAllWonCards().forEach((card: Card) => {
        if (!rankCounts[card.value]) {
          rankCounts[card.value] = [];
        }
        rankCounts[card.value]!.push(card);
      });

      // Find the best rank (highest count, at least 2)
      let bestCards: Card[] = [];
      for (const cards of Object.values(rankCounts)) {
        if (cards.length >= 2 && cards.length > bestCards.length) {
          bestCards = cards;
        }
      }

      return { cards: bestCards };
    },
  },
};
