import type { ObjectiveCard } from "../types";
import type { Game } from "../game";
import type { Seat } from "../seat";
import type { RiderDefinition } from "./types";
import { cardsWinnable, achieveExactly } from "../objectives";

const isEight = (card: { value: number }) => card.value === 8;

export const BlackBreath: RiderDefinition = {
  name: "The Black Breath",
  objective: {
    text: "Win no rank 8 cards",
    getStatus: (game: Game, seat: Seat) => {
      const eights = cardsWinnable(game, seat, isEight);
      return achieveExactly(eights, 0);
    },

    cards: (_game: Game, seat: Seat): { cards: ObjectiveCard[] } => {
      const cards = seat.getAllWonCards().filter(isEight);
      return { cards };
    },
  },
};
