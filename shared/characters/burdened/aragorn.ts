import type { ObjectiveCard, ObjectiveStatus } from "../../types";
import type { CharacterDefinition } from "../types";
import { tricksWinnable, achieveExactly } from "../../objectives";

export const AragornBurdened: CharacterDefinition = {
  name: "Aragorn (Burdened)",
  setupText: "Draw and choose from 2 threat cards, then exchange with anyone",

  setup: async (game, seat, setupContext) => {
    if (game.threatDeck.length === 0) {
      throw new Error("Threat deck is empty!");
    }

    if (game.threatDeck.length === 1) {
      // Only 1 card left, just draw it
      const card = game.threatDeck.shift()!;
      seat.threatCard = card;
      game.log(`${seat.getDisplayName()} draws threat card: ${card}`, true);
      game.notifyStateChange();
    } else {
      // Draw 2, let player choose
      const card1 = game.threatDeck.shift()!;
      const card2 = game.threatDeck.shift()!;

      const choice = await seat.controller.chooseCard({
        title: `${seat.character?.name} - Choose Threat Card`,
        message: "Choose one of these threat cards:",
        cards: [
          { value: card1, suit: "threat" },
          { value: card2, suit: "threat" },
        ],
      });

      const chosen = choice.value;
      const unchosen = chosen === card1 ? card2 : card1;

      seat.threatCard = chosen;
      game.threatDeck.push(unchosen);
      game.log(
        `${seat.getDisplayName()} chooses threat card: ${chosen}`,
        true
      );
      game.notifyStateChange();
    }

    await game.exchange(seat, setupContext, () => true);
  },

  objective: {
    text: "Win exactly the number of tricks shown on your threat card",

    getStatus: (game, seat): ObjectiveStatus => {
      if (!seat.threatCard) {
        return { finality: "tentative", outcome: "failure" };
      }

      const tricks = tricksWinnable(game, seat);
      return achieveExactly(tricks, seat.threatCard);
    },

    cards: (_game, seat) => {
      const cards: ObjectiveCard[] = [];
      cards.push(...Array(seat.getTrickCount()).fill("trick"));
      if (seat.threatCard !== null) {
        cards.push({ suit: "threat", value: seat.threatCard });
      }
      return { cards };
    },
  },
};
