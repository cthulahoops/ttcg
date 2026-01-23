import type { Card } from "../types";
import type { LegacyCharacterDefinition } from "./types";

export const Celeborn: LegacyCharacterDefinition = {
  name: "Celeborn",
  setupText: "Exchange with any player",

  setup: async (game, seat, setupContext) => {
    await game.exchange(seat, setupContext, (_c: string) => true); // Any player
  },

  objective: {
    text: "Win at least three cards of the same rank",
    check: (_game, seat) => {
      const rankCounts: Record<number, number> = {};
      seat.getAllWonCards().forEach((card: Card) => {
        rankCounts[card.value] = (rankCounts[card.value] || 0) + 1;
      });
      return Object.values(rankCounts).some((count) => count >= 3);
    },
    isCompletable: (_game, _seat) => true, // Hard to determine early
    isCompleted: (game, seat) => Celeborn.objective.check(game, seat),
  },

  display: {
    renderStatus: (game, seat) => {
      const rankCounts: Record<number, number> = {};
      seat.getAllWonCards().forEach((card: Card) => {
        rankCounts[card.value] = (rankCounts[card.value] || 0) + 1;
      });
      const met = Celeborn.objective.check(game, seat);
      const completed = Celeborn.objective.isCompleted(game, seat);

      const ranksWithCounts = Object.entries(rankCounts)
        .filter(([_rank, count]) => count >= 2)
        .map(([rank, count]) => `${rank}:${count}`)
        .join(", ");

      return {
        met,
        completable: true,
        completed,
        details: ranksWithCounts || undefined,
      };
    },
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
