import type { Card, ObjectiveCard, ObjectiveStatus } from "../types";
import type { CharacterDefinition } from "./types";
import type { Seat } from "../seat";
import { sortHand } from "../utils";

const countHillsTricks = (seat: Seat) =>
  seat.tricksWon.filter((trick) =>
    trick.cards.some((c: Card) => c.suit === "hills")
  ).length;

export const Shadowfax: CharacterDefinition = {
  name: "Shadowfax",
  setupText:
    "Set one card aside (may return it to hand at any point, must return if hand empty)",

  setup: async (game, seat, _setupContext) => {
    const availableCards = seat.hand.getAvailableCards();

    const cardToSetAside = await seat.controller.chooseCard({
      title: "Shadowfax - Set Card Aside",
      message: "Choose a card to set aside",
      cards: sortHand(availableCards),
    });

    seat.hand.removeCard(cardToSetAside);
    seat.asideCard = cardToSetAside;

    game.log(`${seat.getDisplayName()} sets a card aside`, false, {
      visibleTo: [seat.seatIndex],
      hiddenMessage: `${seat.getDisplayName()} sets a card aside`,
    });
    game.notifyStateChange();
  },

  objective: {
    text: "Win at least two tricks containing a hills card",

    getStatus: (game, seat): ObjectiveStatus => {
      const hillsTricks = countHillsTricks(seat);
      const met = hillsTricks >= 2;

      // Hard to determine completability without knowing remaining hills distribution
      // Simplified: always completable unless already met or game finished

      if (met) {
        return { finality: "final", outcome: "success" };
      }

      if (game.finished) {
        return { finality: "final", outcome: "failure" };
      }

      return { finality: "tentative", outcome: "failure" };
    },

    getDetails: (_game, seat): string => {
      return `Tricks with hills: ${countHillsTricks(seat)}/2`;
    },
  },

  display: {
    getObjectiveCards: (_game, seat) => {
      // Show trick markers for tricks containing hills cards
      const cards: ObjectiveCard[] = Array(countHillsTricks(seat)).fill(
        "trick"
      );
      return { cards };
    },
  },
};
