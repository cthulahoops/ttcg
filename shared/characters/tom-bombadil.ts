import {
  CARDS_PER_SUIT,
  type Card,
  type ObjectiveStatus,
  type Suit,
} from "../types";
import type { CharacterDefinition } from "./types";

export const TomBombadil: CharacterDefinition = {
  name: "Tom Bombadil",
  setupText: "Take the lost card, then exchange with Frodo",

  setup: async (game, seat, setupContext) => {
    await game.takeLostCard(seat);
    await game.exchange(seat, setupContext, (c: string) => c === "Frodo");
  },

  objective: {
    text: "Win 3 or more cards matching the suit of a card left in hand at the end of round",

    getStatus: (game, seat): ObjectiveStatus => {
      const cardsInHand = seat.hand.getAvailableCards();

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

      // Check if met
      let met = false;
      if (cardsInHand.length > 0) {
        for (const card of cardsInHand) {
          if (wonBySuit[card.suit] >= 3) {
            met = true;
            break;
          }
        }
      }

      // Check completability
      let completable: boolean;
      if (game.finished) {
        completable = met;
      } else if (cardsInHand.length === 0) {
        completable = false;
      } else {
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
        completable = false;
        const suitsInHand = new Set(cardsInHand.map((c) => c.suit));
        for (const suit of suitsInHand) {
          const alreadyWon = wonBySuit[suit];
          const needed = 3 - alreadyWon;
          if (needed <= 0) {
            completable = true;
            break;
          }
          // Account for the lost card which is permanently unavailable
          const lostCardOfSuit = game.lostCard?.suit === suit ? 1 : 0;
          const remainingInPlay =
            CARDS_PER_SUIT[suit] - totalWonBySuit[suit] - lostCardOfSuit;
          if (remainingInPlay >= needed) {
            completable = true;
            break;
          }
        }
      }

      // Can only be completed when game is finished
      if (game.finished) {
        return {
          finality: "final",
          outcome: met ? "success" : "failure",
        };
      }

      if (!completable) {
        return { finality: "final", outcome: "failure" };
      }

      return {
        finality: "tentative",
        outcome: met ? "success" : "failure",
      };
    },

    getDetails: (_game, seat): string | undefined => {
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

      return countsDisplay || undefined;
    },
  },

  display: {
    getObjectiveCards: (_game, seat) => {
      const cardsInHand = seat.hand.getAvailableCards();
      const suitsInHand = new Set(cardsInHand.map((c) => c.suit));

      // Show won cards from suits still in hand
      const cards = seat
        .getAllWonCards()
        .filter((c: Card) => suitsInHand.has(c.suit))
        .sort((a, b) => {
          if (a.suit !== b.suit) return a.suit.localeCompare(b.suit);
          return a.value - b.value;
        });
      return { cards };
    },
  },
};
