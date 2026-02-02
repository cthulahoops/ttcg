import type { ObjectiveCard, ObjectiveStatus } from "../types";
import type { CharacterDefinition } from "./types";
import type { Seat } from "../seat";
import type { Game } from "../game";
import { sortHand } from "../utils";
import { achieveAtLeast, tricksWithCardsWinnable } from "../objectives";

const hillsTricks = (game: Game, seat: Seat) =>
  tricksWithCardsWinnable(game, seat, (card) => card.suit === "hills");

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
      return achieveAtLeast(hillsTricks(game, seat), 2);
    },
  },

  display: {
    getObjectiveCards: (game, seat) => {
      // Show trick markers for tricks containing hills cards
      const cards: ObjectiveCard[] = Array(
        hillsTricks(game, seat).current
      ).fill("trick");
      return { cards };
    },
  },
};
