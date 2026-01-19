import type { Card, ObjectiveCard } from "../types";
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
    check: (_game, seat) => countHillsTricks(seat) >= 2,
    isCompletable: (_game, _seat) => {
      // Hard to determine without knowing remaining hills distribution
      // Simplified: always completable
      return true;
    },
    isCompleted: (game, seat) => Shadowfax.objective.check(game, seat),
  },

  display: {
    renderStatus: (game, seat) => {
      const met = Shadowfax.objective.check(game, seat);
      const completable = Shadowfax.objective.isCompletable(game, seat);
      const completed = Shadowfax.objective.isCompleted(game, seat);

      return {
        met,
        completable,
        completed,
        details: `Tricks with hills: ${countHillsTricks(seat)}/2`,
      };
    },
    getObjectiveCards: (_game, seat) => {
      // Show trick markers for tricks containing hills cards
      const cards: ObjectiveCard[] = Array(countHillsTricks(seat)).fill(
        "trick"
      );
      return { cards };
    },
  },
};
