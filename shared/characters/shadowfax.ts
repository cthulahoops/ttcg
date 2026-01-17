import type { Card } from "../types";
import type { CharacterDefinition } from "./types";
import { sortHand } from "../utils";

export const Shadowfax: CharacterDefinition = {
  name: "Shadowfax",
  setupText:
    "Set one card aside (can be played normally, but doesn't count for suit-following)",

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
    check: (_game, seat) => {
      const tricksWithHills = seat.tricksWon.filter(
        (trick: { number: number; cards: Card[] }) =>
          trick.cards.some((c) => c.suit === "hills")
      );
      return tricksWithHills.length >= 2;
    },
    isCompletable: (_game, _seat) => {
      // Hard to determine without knowing remaining hills distribution
      // Simplified: always completable
      return true;
    },
    isCompleted: (game, seat) => Shadowfax.objective.check(game, seat),
  },

  display: {
    renderStatus: (game, seat) => {
      const tricksWithHills = seat.tricksWon.filter(
        (trick: { number: number; cards: Card[] }) =>
          trick.cards.some((c) => c.suit === "hills")
      );
      const met = Shadowfax.objective.check(game, seat);
      const completable = Shadowfax.objective.isCompletable(game, seat);
      const completed = Shadowfax.objective.isCompleted(game, seat);

      return {
        met,
        completable,
        completed,
        details: `Tricks with hills: ${tricksWithHills.length}/2`,
      };
    },
  },
};
