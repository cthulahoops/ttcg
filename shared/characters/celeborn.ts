import type { Card, ObjectiveStatus } from "../types";
import type { CharacterDefinition } from "./types";
import { CARDS_PER_SUIT, SUITS } from "../types";
import { achieveAtLeast, achieveSome } from "../objectives";

export const Celeborn: CharacterDefinition = {
  name: "Celeborn",
  setupText: "Exchange with any player",

  setup: async (game, seat, setupContext) => {
    await game.exchange(seat, setupContext, (_c: string) => true); // Any player
  },

  objective: {
    text: "Win at least three cards of the same rank",

    getStatus: (game, seat): ObjectiveStatus => {
      // Check each rank (1-8) - succeed if ANY rank has 3+ cards
      const rankStatuses = Array.from({ length: 8 }, (_, i) => {
        const rank = i + 1;
        let current = 0;
        let remaining = 0;

        for (const suit of SUITS) {
          if (rank > CARDS_PER_SUIT[suit]) continue;

          if (game.hasCard(seat, suit, rank)) {
            current++;
          } else if (!game.finished && !game.cardGone(seat, suit, rank)) {
            // Only count as remaining if game isn't finished and card isn't gone
            remaining++;
          }
        }

        // No tricksRemaining cap - one trick can capture multiple same-rank cards
        return achieveAtLeast({ current, max: current + remaining }, 3);
      });

      return achieveSome(rankStatuses);
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
