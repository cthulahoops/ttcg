import type { ObjectiveCard } from "../types";
import type { CharacterDefinition } from "./types";

export const Gimli: CharacterDefinition = {
  name: "Gimli",
  setupText:
    "Draw a Mountains threat card, then exchange with Legolas or Aragorn",

  setup: async (game, seat, setupContext) => {
    await game.drawThreatCard(seat, {
      exclude: game.lostCard?.value,
    });
    await game.exchange(seat, setupContext, (c: string) =>
      ["Legolas", "Aragorn"].includes(c)
    );
  },

  objective: {
    text: "Win the Mountains card matching your threat card",
    check: (game, seat) => {
      if (!seat.threatCard) return false;
      return game.hasCard(seat, "mountains", seat.threatCard);
    },
    isCompletable: (game, seat) => {
      if (!seat.threatCard) return true;
      return !game.cardGone(seat, "mountains", seat.threatCard);
    },
    isCompleted: (game, seat) => Gimli.objective.check(game, seat),
  },

  display: {
    renderStatus: (game, seat) => {
      const met = Gimli.objective.check(game, seat);
      const completable = Gimli.objective.isCompletable(game, seat);
      const completed = Gimli.objective.isCompleted(game, seat);
      return { met, completable, completed };
    },
    getObjectiveCards: (game, seat) => {
      const cards: ObjectiveCard[] = [];
      if (seat.threatCard !== null) {
        cards.push({ suit: "threat", value: seat.threatCard });
        if (game.hasCard(seat, "mountains", seat.threatCard)) {
          cards.push({ suit: "mountains", value: seat.threatCard });
        }
      }
      return { cards };
    },
  },
};
