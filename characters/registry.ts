// Character Registry
// All character definitions in one place

import type { Seat } from "../seat";
import type { Suit } from "../types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Game = any; // Will be properly typed when game.ts is converted
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SetupContext = any;

interface CharacterObjective {
  text?: string;
  getText?: (game: Game) => string;
  check: (game: Game, seat: Seat) => boolean;
  isCompletable: (game: Game, seat: Seat) => boolean;
}

interface CharacterDisplay {
  renderStatus: (game: Game, seat: Seat) => string;
}

interface CharacterDefinition {
  name: string;
  setupText: string;
  threatSuit?: Suit;
  setup: (game: Game, seat: Seat, setupContext: SetupContext) => Promise<void>;
  objective: CharacterObjective;
  display: CharacterDisplay;
}

const Frodo: CharacterDefinition = {
  name: "Frodo",
  setupText: "No setup action",

  setup: async (_game, _seat, _setupContext) => {
    // No setup action
  },

  objective: {
    getText: (game) => {
      const needed = game.numCharacters === 3 ? "four" : "two";
      return `Win at least ${needed} ring cards`;
    },
    check: (game, seat) => {
      const ringsNeeded = game.numCharacters === 3 ? 4 : 2;
      const ringCards = seat.getAllWonCards().filter((c) => c.suit === "rings");
      return ringCards.length >= ringsNeeded;
    },
    isCompletable: (game, seat) => {
      const ringsNeeded = game.numCharacters === 3 ? 4 : 2;
      const myRings = seat
        .getAllWonCards()
        .filter((c) => c.suit === "rings").length;
      const othersRings = game.seats.reduce((total: number, s: Seat) => {
        if (s.seatIndex !== seat.seatIndex) {
          return (
            total + s.getAllWonCards().filter((c) => c.suit === "rings").length
          );
        }
        return total;
      }, 0);
      const ringsRemaining = 5 - myRings - othersRings;
      return myRings + ringsRemaining >= ringsNeeded;
    },
  },

  display: {
    renderStatus: (game, seat) => {
      const ringCards = seat.getAllWonCards().filter((c) => c.suit === "rings");
      const ringsNeeded = game.numCharacters === 3 ? 4 : 2;
      const met = ringCards.length >= ringsNeeded;
      const completable = Frodo.objective.isCompletable(game, seat);
      const icon = game.displaySimple(met, completable);

      if (ringCards.length > 0) {
        const ringList = ringCards
          .map((c) => c.value)
          .sort((a: number, b: number) => a - b)
          .join(", ");
        return `${icon} Rings: ${ringList}`;
      } else {
        return `${icon} Rings: none`;
      }
    },
  },
};

const Gandalf: CharacterDefinition = {
  name: "Gandalf",
  setupText: "Optionally take the lost card, then exchange with Frodo",

  setup: async (game, seat, setupContext) => {
    await game.offerLostCard(seat);
    await game.exchange(seat, setupContext, (c: string) => c === "Frodo");
  },

  objective: {
    text: "Win at least one trick",
    check: (_game, seat) => seat.getTrickCount() >= 1,
    isCompletable: (_game, _seat) => true, // Always possible
  },

  display: {
    renderStatus: (game, seat) => {
      const met = Gandalf.objective.check(game, seat);
      return game.displaySimple(met, true);
    },
  },
};

const Merry: CharacterDefinition = {
  name: "Merry",
  setupText: "Exchange with Frodo, Pippin, or Sam",

  setup: async (game, seat, setupContext) => {
    await game.exchange(seat, setupContext, (c: string) =>
      ["Frodo", "Pippin", "Sam"].includes(c),
    );
  },

  objective: {
    text: "Win exactly one or two tricks",
    check: (_game, seat) => {
      const count = seat.getTrickCount();
      return count === 1 || count === 2;
    },
    isCompletable: (_game, seat) => seat.getTrickCount() < 3,
  },

  display: {
    renderStatus: (game, seat) => {
      const met = Merry.objective.check(game, seat);
      const completable = Merry.objective.isCompletable(game, seat);
      return game.displaySimple(met, completable);
    },
  },
};

const Celeborn: CharacterDefinition = {
  name: "Celeborn",
  setupText: "Exchange with any player",

  setup: async (game, seat, setupContext) => {
    await game.exchange(seat, setupContext, (_c: string) => true); // Any player
  },

  objective: {
    text: "Win at least three cards of the same rank",
    check: (_game, seat) => {
      const rankCounts: Record<number, number> = {};
      seat.getAllWonCards().forEach((card) => {
        rankCounts[card.value] = (rankCounts[card.value] || 0) + 1;
      });
      return Object.values(rankCounts).some((count) => count >= 3);
    },
    isCompletable: (_game, _seat) => true, // Hard to determine early
  },

  display: {
    renderStatus: (game, seat) => {
      const rankCounts: Record<number, number> = {};
      seat.getAllWonCards().forEach((card) => {
        rankCounts[card.value] = (rankCounts[card.value] || 0) + 1;
      });
      const met = Celeborn.objective.check(game, seat);
      const icon = game.displaySimple(met, true);

      // Show ranks with counts >= 2
      const ranksWithCounts = Object.entries(rankCounts)
        .filter(([_rank, count]) => count >= 2)
        .map(([rank, count]) => `${rank}:${count}`)
        .join(", ");

      return ranksWithCounts ? `${icon} ${ranksWithCounts}` : icon;
    },
  },
};

const Pippin: CharacterDefinition = {
  name: "Pippin",
  setupText: "Exchange with Frodo, Merry, or Sam",

  setup: async (game, seat, setupContext) => {
    await game.exchange(seat, setupContext, (c: string) =>
      ["Frodo", "Merry", "Sam"].includes(c),
    );
  },

  objective: {
    text: "Win the fewest (or joint fewest) tricks",
    check: (game, seat) => {
      const allCounts = game.seats.map((s: Seat) => s.getTrickCount());
      const minCount = Math.min(...allCounts);
      return seat.getTrickCount() === minCount;
    },
    isCompletable: (game, seat) => {
      const allCounts = game.seats.map((s: Seat) => s.getTrickCount());
      const myCount = seat.getTrickCount();

      let totalGap = 0;
      const totalTricks = game.seats.length === 3 ? 12 : 9;
      let tricksPlayed = 0;
      for (const otherTricks of allCounts) {
        if (otherTricks < myCount) {
          totalGap += myCount - otherTricks;
        }
        tricksPlayed += otherTricks;
      }

      const remainingTricks = totalTricks - tricksPlayed;
      return totalGap <= remainingTricks;
    },
  },

  display: {
    renderStatus: (game, seat) => {
      const met = Pippin.objective.check(game, seat);
      const completable = Pippin.objective.isCompletable(game, seat);
      return game.displaySimple(met, completable);
    },
  },
};

const Boromir: CharacterDefinition = {
  name: "Boromir",
  setupText: "Exchange with anyone except Frodo",

  setup: async (game, seat, setupContext) => {
    await game.exchange(seat, setupContext, (c: string) => c !== "Frodo");
  },

  objective: {
    text: "Win the last trick; do NOT win the 1 of Rings",
    check: (game, seat) => {
      const wonLast = game.lastTrickWinner === seat.seatIndex;
      const hasOneRing = game.hasCard(seat, "rings", 1);
      return wonLast && !hasOneRing;
    },
    isCompletable: (game, seat) => !game.hasCard(seat, "rings", 1),
  },

  display: {
    renderStatus: (game, seat) => {
      const wonLast = game.lastTrickWinner === seat.seatIndex;
      const hasOneRing = game.hasCard(seat, "rings", 1);
      const met = Boromir.objective.check(game, seat);
      const completable = Boromir.objective.isCompletable(game, seat);
      const icon = game.displaySimple(met, completable);

      const lastIcon = wonLast ? "✓" : "✗";
      const oneRingIcon = hasOneRing ? "✗ (has 1-Ring)" : "✓";
      return `${icon} Last: ${lastIcon}, 1-Ring: ${oneRingIcon}`;
    },
  },
};

const Sam: CharacterDefinition = {
  name: "Sam",
  threatSuit: "hills",
  setupText:
    "Draw a Hills threat card, then exchange with Frodo, Merry, or Pippin",

  setup: async (game, seat, setupContext) => {
    await game.drawThreatCard(seat, Sam.threatSuit, {
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
      return game.hasCard(seat, Sam.threatSuit, seat.threatCard);
    },
    isCompletable: (game, seat) => {
      if (!seat.threatCard) return true;
      return !game.cardGone(seat, Sam.threatSuit, seat.threatCard);
    },
  },

  display: {
    renderStatus: (game, seat) => {
      const met = Sam.objective.check(game, seat);
      const completable = Sam.objective.isCompletable(game, seat);
      return game.displayThreatCard(seat, met, completable);
    },
  },
};

const Gimli: CharacterDefinition = {
  name: "Gimli",
  threatSuit: "mountains",
  setupText:
    "Draw a Mountains threat card, then exchange with Legolas or Aragorn",

  setup: async (game, seat, setupContext) => {
    await game.drawThreatCard(seat, Gimli.threatSuit, {
      exclude: game.lostCard?.value,
    });
    await game.exchange(seat, setupContext, (c: string) =>
      ["Legolas", "Aragorn"].includes(c),
    );
  },

  objective: {
    text: "Win the Mountains card matching your threat card",
    check: (game, seat) => {
      if (!seat.threatCard) return false;
      return game.hasCard(seat, Gimli.threatSuit, seat.threatCard);
    },
    isCompletable: (game, seat) => {
      if (!seat.threatCard) return true;
      return !game.cardGone(seat, Gimli.threatSuit, seat.threatCard);
    },
  },

  display: {
    renderStatus: (game, seat) => {
      const met = Gimli.objective.check(game, seat);
      const completable = Gimli.objective.isCompletable(game, seat);
      return game.displayThreatCard(seat, met, completable);
    },
  },
};

const Legolas: CharacterDefinition = {
  name: "Legolas",
  threatSuit: "forests",
  setupText: "Draw a Forests threat card, then exchange with Gimli or Aragorn",

  setup: async (game, seat, setupContext) => {
    await game.drawThreatCard(seat, Legolas.threatSuit, {
      exclude: game.lostCard?.value,
    });
    await game.exchange(seat, setupContext, (c: string) =>
      ["Gimli", "Aragorn"].includes(c),
    );
  },

  objective: {
    text: "Win the Forests card matching your threat card",
    check: (game, seat) => {
      if (!seat.threatCard) return false;
      return game.hasCard(seat, Legolas.threatSuit, seat.threatCard);
    },
    isCompletable: (game, seat) => {
      if (!seat.threatCard) return true;
      return !game.cardGone(seat, Legolas.threatSuit, seat.threatCard);
    },
  },

  display: {
    renderStatus: (game, seat) => {
      const met = Legolas.objective.check(game, seat);
      const completable = Legolas.objective.isCompletable(game, seat);
      return game.displayThreatCard(seat, met, completable);
    },
  },
};

const Aragorn: CharacterDefinition = {
  name: "Aragorn",
  setupText: "Choose a threat card, then exchange with Gimli or Legolas",

  setup: async (game, seat, setupContext) => {
    await game.chooseThreatCard(seat);
    await game.exchange(seat, setupContext, (c: string) =>
      ["Gimli", "Legolas"].includes(c),
    );
  },

  objective: {
    text: "Win exactly the number of tricks shown on your threat card",
    check: (_game, seat) => {
      if (!seat.threatCard) return false;
      return seat.getTrickCount() === seat.threatCard;
    },
    isCompletable: (_game, seat) => {
      if (!seat.threatCard) return true;
      const target = seat.threatCard;
      const current = seat.getTrickCount();
      // Impossible if already over target
      if (current > target) return false;
      // Otherwise check if gap is closeable
      // (Need to implement proper remaining tricks calculation)
      return true; // Simplified for now
    },
  },

  display: {
    renderStatus: (game, seat) => {
      const met = Aragorn.objective.check(game, seat);
      const completable = Aragorn.objective.isCompletable(game, seat);
      return game.displayThreatCard(seat, met, completable);
    },
  },
};

const Goldberry: CharacterDefinition = {
  name: "Goldberry",
  setupText: "Turn your hand face-up (visible to all players)",

  setup: async (game, seat, _setupContext) => {
    game.revealHand(seat);
    // No exchange
  },

  objective: {
    text: "Win exactly three tricks in a row and no other tricks",
    check: (_game, seat) => {
      const trickNumbers = seat.tricksWon
        .map((t) => t.number)
        .sort((a, b) => a - b);

      if (trickNumbers.length !== 3) return false;

      // Check if consecutive
      return (
        trickNumbers[1] === trickNumbers[0] + 1 &&
        trickNumbers[2] === trickNumbers[1] + 1
      );
    },
    isCompletable: (_game, seat) => {
      const trickCount = seat.getTrickCount();
      if (trickCount > 3) return false; // Already won too many

      if (trickCount === 0) return true; // Haven't started yet

      // Check if current tricks are consecutive from some starting point
      // and if we can still win exactly 3 consecutive
      // (Complex logic - simplified here)
      return true;
    },
  },

  display: {
    renderStatus: (game, seat) => {
      const met = Goldberry.objective.check(game, seat);
      const completable = Goldberry.objective.isCompletable(game, seat);
      return game.displaySimple(met, completable);
    },
  },
};

const Glorfindel: CharacterDefinition = {
  name: "Glorfindel",
  setupText: "Optionally take the lost card",

  setup: async (game, seat, _setupContext) => {
    await game.offerLostCard(seat);
    // No exchange
  },

  objective: {
    text: "Win every Shadows card",
    check: (_game, seat) => {
      const shadowsCards = seat
        .getAllWonCards()
        .filter((c) => c.suit === "shadows");
      return shadowsCards.length === 8; // All shadows cards (1-8)
    },
    isCompletable: (game, seat) => {
      // Check if any shadows card has been won by someone else
      for (let value = 1; value <= 8; value++) {
        if (game.cardGone(seat, "shadows", value)) {
          return false;
        }
      }
      return true;
    },
  },

  display: {
    renderStatus: (game, seat) => {
      const shadowsCards = seat
        .getAllWonCards()
        .filter((c) => c.suit === "shadows");
      const met = Glorfindel.objective.check(game, seat);
      const completable = Glorfindel.objective.isCompletable(game, seat);
      const icon = game.displaySimple(met, completable);

      return `${icon} Shadows: ${shadowsCards.length}/8`;
    },
  },
};

const Galadriel: CharacterDefinition = {
  name: "Galadriel",
  setupText: "Exchange with either the lost card or Gandalf",

  setup: async (game, seat, setupContext) => {
    const choice = await game.choice(seat, "Exchange with?", [
      "Lost Card",
      "Gandalf",
    ]);

    if (choice === "Lost Card") {
      await game.exchangeWithLostCard(seat, setupContext);
    } else {
      await game.exchange(seat, setupContext, (c: string) => c === "Gandalf");
    }
  },

  objective: {
    text: "Win neither the fewest nor the most tricks",
    check: (game, seat) => {
      const allCounts = game.seats.map((s: Seat) => s.getTrickCount());
      const minCount = Math.min(...allCounts);
      const maxCount = Math.max(...allCounts);
      const myCount = seat.getTrickCount();
      return myCount !== minCount && myCount !== maxCount;
    },
    isCompletable: (game, seat) => {
      const allCounts = game.seats.map((s: Seat) => s.getTrickCount());
      const minCount = Math.min(...allCounts);
      const maxCount = Math.max(...allCounts);
      const myCount = seat.getTrickCount();

      // If we're sole min or sole max, it's impossible
      const minSeats = allCounts.filter((c: number) => c === minCount).length;
      const maxSeats = allCounts.filter((c: number) => c === maxCount).length;

      if (myCount === minCount && minSeats === 1) return false;
      if (myCount === maxCount && maxSeats === 1) return false;

      return true;
    },
  },

  display: {
    renderStatus: (game, seat) => {
      const met = Galadriel.objective.check(game, seat);
      const completable = Galadriel.objective.isCompletable(game, seat);
      return game.displaySimple(met, completable);
    },
  },
};

const GildorInglorian: CharacterDefinition = {
  name: "Gildor Inglorian",
  setupText: "Exchange with Frodo",

  setup: async (game, seat, setupContext) => {
    await game.exchange(seat, setupContext, (c: string) => c === "Frodo");
  },

  objective: {
    text: "Play a forests card in final trick",
    check: (game, seat) => {
      if (!game.finished) {
        return false; // Final trick hasn't been played yet
      }

      // Find the last card played by this seat
      const lastCardPlayed = seat.playedCards[seat.playedCards.length - 1];

      return lastCardPlayed && lastCardPlayed.suit === "forests";
    },
    isCompletable: (game, seat) => {
      if (game.finished) {
        return GildorInglorian.objective.check(game, seat);
      }

      // Still completable if player has forests cards in hand
      const availableCards = seat.hand!.getAvailableCards();
      return availableCards.some((c) => c.suit === "forests");
    },
  },

  display: {
    renderStatus: (game, seat) => {
      const met = GildorInglorian.objective.check(game, seat);
      const completable = GildorInglorian.objective.isCompletable(game, seat);
      const icon = game.displaySimple(met, completable);

      if (game.finished) {
        // Final trick played
        return `${icon} Final trick played`;
      } else {
        // Show forests cards remaining in hand
        const availableCards = seat.hand!.getAvailableCards();
        const forestsInHand = availableCards.filter(
          (c) => c.suit === "forests",
        ).length;
        return `${icon} Forests: ${forestsInHand} in hand`;
      }
    },
  },
};

const FarmerMaggot: CharacterDefinition = {
  name: "Farmer Maggot",
  threatSuit: "hills",
  setupText: "Draw a Hills threat card, then exchange with Merry or Pippin",

  setup: async (game, seat, setupContext) => {
    await game.drawThreatCard(seat, FarmerMaggot.threatSuit, {
      exclude: game.lostCard?.value,
    });
    await game.exchange(seat, setupContext, (c: string) =>
      ["Merry", "Pippin"].includes(c),
    );
  },

  objective: {
    text: "Win at least two cards matching the threat card rank",
    check: (_game, seat) => {
      if (!seat.threatCard) return false;
      const matchingCards = seat
        .getAllWonCards()
        .filter((c) => c.value === seat.threatCard);
      return matchingCards.length >= 2;
    },
    isCompletable: (game, seat) => {
      if (!seat.threatCard) return true;

      // Count how many cards of the threat rank we've won
      const matchingWon = seat
        .getAllWonCards()
        .filter((c) => c.value === seat.threatCard).length;

      // Count how many cards of the threat rank are still available
      // (not won by any player, not the lost card)
      let matchingAvailable = 0;
      const suits: Suit[] = [
        "mountains",
        "shadows",
        "forests",
        "hills",
        "rings",
      ];

      for (const suit of suits) {
        // Check if this rank exists in this suit (1-8 for normal suits, 1-5 for rings)
        const maxValue = suit === "rings" ? 5 : 8;
        if (seat.threatCard <= maxValue) {
          // Check if this card is gone
          if (!game.cardGone(seat, suit, seat.threatCard)) {
            matchingAvailable++;
          }
        }
      }

      return matchingWon + matchingAvailable >= 2;
    },
  },

  display: {
    renderStatus: (game, seat) => {
      if (!seat.threatCard) {
        return game.displaySimple(false, true);
      }

      const matchingCards = seat
        .getAllWonCards()
        .filter((c) => c.value === seat.threatCard);
      const met = FarmerMaggot.objective.check(game, seat);
      const completable = FarmerMaggot.objective.isCompletable(game, seat);
      const icon = game.displaySimple(met, completable);

      return `${icon} Threat: ${seat.threatCard}, Won: ${matchingCards.length}/2`;
    },
  },
};

const FattyBolger: CharacterDefinition = {
  name: "Fatty Bolger",
  setupText: "Give a card to every other character (don't take any back)",

  setup: async (game, seat, _setupContext) => {
    // Give a card to each other character
    for (const otherSeat of game.seats) {
      if (otherSeat.seatIndex !== seat.seatIndex) {
        const availableCards = seat.hand!.getAvailableCards();
        if (availableCards.length === 0) {
          break; // No more cards to give
        }

        await game.giveCard(seat, otherSeat);
      }
    }

    // One extra trick will be played
    game.tricksToPlay += 1;
  },

  objective: {
    text: "Win exactly one trick",
    check: (_game, seat) => seat.getTrickCount() === 1,
    isCompletable: (_game, seat) => seat.getTrickCount() <= 1,
  },

  display: {
    renderStatus: (game, seat) => {
      const met = FattyBolger.objective.check(game, seat);
      const completable = FattyBolger.objective.isCompletable(game, seat);
      return game.displaySimple(met, completable);
    },
  },
};

const TomBombadil: CharacterDefinition = {
  name: "Tom Bombadil",
  setupText: "Take the lost card, then exchange with Frodo",

  setup: async (game, seat, setupContext) => {
    await game.offerLostCard(seat);
    await game.exchange(seat, setupContext, (c: string) => c === "Frodo");
  },

  objective: {
    text: "Win 3 or more cards matching the suit of a card left in hand at the end of round",
    check: (_game, seat) => {
      // Must have at least one card left in hand
      const cardsInHand = seat.hand!.getAvailableCards();
      if (cardsInHand.length === 0) return false;

      // Count cards won by suit
      const wonBySuit: Record<Suit, number> = {
        mountains: 0,
        shadows: 0,
        forests: 0,
        hills: 0,
        rings: 0,
      };

      seat.getAllWonCards().forEach((card) => {
        wonBySuit[card.suit] = (wonBySuit[card.suit] || 0) + 1;
      });

      // Check if any suit in hand has 3+ won cards
      for (const card of cardsInHand) {
        if (wonBySuit[card.suit] >= 3) {
          return true;
        }
      }

      return false;
    },
    isCompletable: (game, seat) => {
      if (game.finished) {
        return TomBombadil.objective.check(game, seat);
      }

      // TODO: Implement proper completability check
      // (need to check if we can still win 3+ cards of suits in hand)
      return true;
    },
  },

  display: {
    renderStatus: (game, seat) => {
      const met = TomBombadil.objective.check(game, seat);
      const completable = TomBombadil.objective.isCompletable(game, seat);
      const icon = game.displaySimple(met, completable);

      // Show suit counts with 2+ cards
      const wonBySuit: Record<Suit, number> = {
        mountains: 0,
        shadows: 0,
        forests: 0,
        hills: 0,
        rings: 0,
      };

      seat.getAllWonCards().forEach((card) => {
        wonBySuit[card.suit] = (wonBySuit[card.suit] || 0) + 1;
      });

      const suitSymbols: Record<Suit, string> = {
        mountains: "⛰️",
        shadows: "👁️",
        forests: "🌲",
        hills: "🏔️",
        rings: "💍",
      };

      const countsDisplay = (Object.keys(wonBySuit) as Suit[])
        .filter((suit) => wonBySuit[suit] >= 2)
        .map((suit) => `${suitSymbols[suit]}:${wonBySuit[suit]}`)
        .join(" ");

      return countsDisplay ? `${icon} ${countsDisplay}` : icon;
    },
  },
};

export const characterRegistry = new Map<string, CharacterDefinition>([
  [Frodo.name, Frodo],
  [Gandalf.name, Gandalf],
  [Merry.name, Merry],
  [Celeborn.name, Celeborn],
  [Pippin.name, Pippin],
  [Boromir.name, Boromir],
  [Sam.name, Sam],
  [Gimli.name, Gimli],
  [Legolas.name, Legolas],
  [Aragorn.name, Aragorn],
  [Goldberry.name, Goldberry],
  [Glorfindel.name, Glorfindel],
  [Galadriel.name, Galadriel],
  [GildorInglorian.name, GildorInglorian],
  [FarmerMaggot.name, FarmerMaggot],
  [FattyBolger.name, FattyBolger],
  [TomBombadil.name, TomBombadil],
]);

export const allCharacterNames = Array.from(characterRegistry.keys());
