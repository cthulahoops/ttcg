import type { ObjectiveCard, Card, ObjectiveStatus } from "../types";
import { CARDS_PER_SUIT } from "../types";
import type { CharacterDefinition } from "./types";
import { cardsWinnable, achieveAtLeast } from "../objectives";

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

      const threatValue = seat.threatCard;
      const matchesThreat = (card: Card) =>
        card.value === threatValue && threatValue <= CARDS_PER_SUIT[card.suit];

      return achieveAtLeast(cardsWinnable(game, seat, matchesThreat), 2);
    },

    cards: (_game, seat) => {
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
