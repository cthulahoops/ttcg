import type { ObjectiveStatus } from "../types";
import type { CharacterDefinition } from "./types";
import type { Game } from "../game";
import type { Seat } from "../seat";
import {
  achieveAtLeast,
  achieveBoth,
  cardsWinnable,
  doNot,
  type ObjectivePossibilities,
} from "../objectives";

/**
 * Returns possibilities for winning the final trick of the game.
 * current: 1 if this seat won the most recent trick (which could be the last), 0 otherwise
 * max: 1 if the final trick can still be won, current otherwise
 */
function lastTrickWinnable(game: Game, seat: Seat): ObjectivePossibilities {
  const current = game.lastTrickWinner === seat.seatIndex ? 1 : 0;

  if (game.finished) {
    return { current, max: current };
  }

  // The last trick hasn't been played yet, so max is 1
  return { current, max: 1 };
}

export const Boromir: CharacterDefinition = {
  name: "Boromir",
  setupText: "Exchange with anyone except Frodo",

  setup: async (game, seat, setupContext) => {
    await game.exchange(seat, setupContext, (c: string) => c !== "Frodo");
  },

  objective: {
    text: "Win the last trick; do NOT win the 1 of Rings",

    getStatus: (game, seat): ObjectiveStatus => {
      // Win the last trick
      const winLastTrick = achieveAtLeast(lastTrickWinnable(game, seat), 1);

      // Do NOT win the 1 of Rings
      const oneRing = cardsWinnable(
        game,
        seat,
        (card) => card.suit === "rings" && card.value === 1
      );
      const avoidOneRing = doNot(achieveAtLeast(oneRing, 1));

      return achieveBoth(winLastTrick, avoidOneRing);
    },

    getDetails: (game, seat): string => {
      const wonLast = game.lastTrickWinner === seat.seatIndex;
      const hasOneRing = game.hasCard(seat, "rings", 1);

      const lastIcon = wonLast ? "yes" : "no";
      const oneRingIcon = hasOneRing ? "has 1-Ring" : "ok";
      return `Last: ${lastIcon}, 1-Ring: ${oneRingIcon}`;
    },
  },

  display: {},
};
