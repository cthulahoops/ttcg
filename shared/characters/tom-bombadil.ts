import { CARDS_PER_SUIT, type Card, type Suit } from "../types";
import type { CharacterDefinition } from "./types";
import { requireHand } from "../seat";

export const TomBombadil: CharacterDefinition = {
  name: "Tom Bombadil",
  setupText: "Take the lost card, then exchange with Frodo",

  setup: async (game, seat, setupContext) => {
    await game.takeLostCard(seat);
    await game.exchange(seat, setupContext, (c: string) => c === "Frodo");
  },

  objective: {
    text: "Win 3 or more cards matching the suit of a card left in hand at the end of round",
    check: (_game, seat) => {
      const cardsInHand = requireHand(seat).hand.getAvailableCards();
      if (cardsInHand.length === 0) return false;

      const wonBySuit: Record<Suit, number> = {
        mountains: 0,
        shadows: 0,
        forests: 0,
        hills: 0,
        rings: 0,
      };

      seat.getAllWonCards().forEach((card: Card) => {
        wonBySuit[card.suit] = (wonBySuit[card.suit] || 0) + 1;
      });

      for (const card of cardsInHand) {
        if (wonBySuit[card.suit] >= 3) {
          return true;
        }
      }

      return false;
    },
    isCompletable: (game, seat) => {
      if (game.finished) {
        return TomBombadil.objective.check(game, seat);
      }

      const cardsInHand = requireHand(seat).hand.getAvailableCards();
      if (cardsInHand.length === 0) {
        // No cards in hand means we can't have a matching suit at end
        return false;
      }

      // Count how many cards of each suit Tom has won
      const wonBySuit: Record<Suit, number> = {
        mountains: 0,
        shadows: 0,
        forests: 0,
        hills: 0,
        rings: 0,
      };

      seat.getAllWonCards().forEach((card: Card) => {
        wonBySuit[card.suit] = (wonBySuit[card.suit] || 0) + 1;
      });

      // Count total won cards by all players for each suit
      const totalWonBySuit: Record<Suit, number> = {
        mountains: 0,
        shadows: 0,
        forests: 0,
        hills: 0,
        rings: 0,
      };

      for (const s of game.seats) {
        s.getAllWonCards().forEach((card: Card) => {
          totalWonBySuit[card.suit] = (totalWonBySuit[card.suit] || 0) + 1;
        });
      }

      // Check if any suit in hand can still reach 3 won cards
      const suitsInHand = new Set(cardsInHand.map((c) => c.suit));
      for (const suit of suitsInHand) {
        const alreadyWon = wonBySuit[suit];
        const needed = 3 - alreadyWon;
        if (needed <= 0) {
          // Already have 3+ of this suit
          return true;
        }
        const remainingInPlay = CARDS_PER_SUIT[suit] - totalWonBySuit[suit];
        if (remainingInPlay >= needed) {
          // Still possible to win enough
          return true;
        }
      }

      return false;
    },
    isCompleted: (game, seat) => game.finished && TomBombadil.objective.check(game, seat),
  },

  display: {
    renderStatus: (game, seat) => {
      const met = TomBombadil.objective.check(game, seat);
      const completable = TomBombadil.objective.isCompletable(game, seat);
      const completed = TomBombadil.objective.isCompleted(game, seat);

      const wonBySuit: Record<Suit, number> = {
        mountains: 0,
        shadows: 0,
        forests: 0,
        hills: 0,
        rings: 0,
      };

      seat.getAllWonCards().forEach((card: Card) => {
        wonBySuit[card.suit] = (wonBySuit[card.suit] || 0) + 1;
      });

      const suitSymbols: Record<Suit, string> = {
        mountains: "⛰️",
        shadows: "👁️",
        forests: "🌲",
        hills: "🏔️",
        rings: "💍",
      };

      const countsDisplay = (Object.keys(wonBySuit) as Suit[])
        .filter((suit) => wonBySuit[suit] >= 2)
        .map((suit) => `${suitSymbols[suit]}:${wonBySuit[suit]}`)
        .join(" ");

      return {
        met,
        completable,
        completed,
        details: countsDisplay || undefined,
      };
    },
  },
};
