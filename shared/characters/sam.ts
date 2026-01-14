import type { CharacterDefinition } from "./types";

export const Sam: CharacterDefinition = {
  name: "Sam",
  setupText:
    "Draw a Hills threat card, then exchange with Frodo, Merry, or Pippin",

  setup: async (game, seat, setupContext) => {
    await game.drawThreatCard(seat, {
      exclude: game.lostCard?.value,
    });
    await game.exchange(seat, setupContext, (c: string) =>
      ["Frodo", "Merry", "Pippin"].includes(c),
    );
  },

  objective: {
    text: "Win the Hills card matching your threat card",
    check: (game, seat) => {
      if (!seat.threatCard) return false;
      return game.hasCard(seat, "hills", seat.threatCard);
    },
    isCompletable: (game, seat) => {
      if (!seat.threatCard) return true;
      return !game.cardGone(seat, "hills", seat.threatCard);
    },
    isCompleted: (game, seat) => Sam.objective.check(game, seat),
  },

  display: {
    renderStatus: (game, seat) => {
      const met = Sam.objective.check(game, seat);
      const completable = Sam.objective.isCompletable(game, seat);
      return game.displayThreatCard(seat, met, completable);
    },
  },
};
