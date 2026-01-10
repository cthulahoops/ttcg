// Character Registry
// All character definitions in one place

import type { Seat } from "../seat";
import type { Card, Suit } from "../types";
import type { Game } from "../game";
import { sortHand } from "../utils";

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
    await game.takeLostCard(seat);
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

      // Calculate total gap: how many more tricks does Pippin have than players with fewer?
      let totalGap = 0;
      for (const otherTricks of allCounts) {
        if (otherTricks < myCount) {
          totalGap += myCount - otherTricks;
        }
      }

      // Can still complete if other players can catch up with remaining tricks
      return totalGap <= game.tricksRemaining();
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
  setupText:
    "Draw a Mountains threat card, then exchange with Legolas or Aragorn",

  setup: async (game, seat, setupContext) => {
    await game.drawThreatCard(seat, {
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
      return game.hasCard(seat, "mountains", seat.threatCard);
    },
    isCompletable: (game, seat) => {
      if (!seat.threatCard) return true;
      return !game.cardGone(seat, "mountains", seat.threatCard);
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
  setupText: "Draw a Forests threat card, then exchange with Gimli or Aragorn",

  setup: async (game, seat, setupContext) => {
    await game.drawThreatCard(seat, {
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
      return game.hasCard(seat, "forests", seat.threatCard);
    },
    isCompletable: (game, seat) => {
      if (!seat.threatCard) return true;
      return !game.cardGone(seat, "forests", seat.threatCard);
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
    isCompletable: (game, seat) => {
      const trickCount = seat.getTrickCount();

      // Already won too many
      if (trickCount > 3) return false;

      // Already won exactly 3 - just check if they're consecutive
      if (trickCount === 3) {
        return Goldberry.objective.check(game, seat);
      }

      // Haven't won any yet - need at least 3 tricks remaining
      if (trickCount === 0) {
        return game.tricksRemaining() >= 3;
      }

      // Won 1 or 2 tricks - check if they're consecutive and we can complete the run
      const trickNumbers = seat.tricksWon
        .map((t) => t.number)
        .sort((a, b) => a - b);

      // Check if currently won tricks are consecutive
      for (let i = 1; i < trickNumbers.length; i++) {
        if (trickNumbers[i] !== trickNumbers[i - 1] + 1) {
          return false;
        }
      }

      // Tricks are consecutive. Check if we can still complete a run of 3.
      const maxTrickWon = trickNumbers[trickNumbers.length - 1];

      // If the next required trick has already been played, it's impossible
      if (game.currentTrickNumber > maxTrickWon + 1) {
        return false;
      }

      // Check if there are enough tricks remaining to reach 3 total
      const tricksNeeded = 3 - trickCount;
      return game.tricksRemaining() >= tricksNeeded;
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
    await game.takeLostCard(seat);
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

      // Optimistic assumption: currentMin stays finalMin
      // Galadriel needs to be at least currentMin + 1
      const targetGaladriel = Math.max(minCount + 1, myCount);

      // Someone needs to be above Galadriel for max
      const targetMax = Math.max(maxCount, targetGaladriel + 1);

      // Calculate tricks needed to reach this state
      const tricksNeededForGaladriel = targetGaladriel - myCount;
      const tricksNeededForMax = targetMax - maxCount;

      return (
        tricksNeededForGaladriel + tricksNeededForMax <= game.tricksRemaining()
      );
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
  setupText: "Draw a Hills threat card, then exchange with Merry or Pippin",

  setup: async (game, seat, setupContext) => {
    await game.drawThreatCard(seat);
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
    await game.takeLostCard(seat);
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

const BarlimanButterbur: CharacterDefinition = {
  name: "Barliman Butterbur",
  setupText: "Exchange with any player",

  setup: async (game, seat, setupContext) => {
    await game.exchange(seat, setupContext, (_c: string) => true); // Any player
  },

  objective: {
    text: "Win at least one of the last three tricks",
    check: (game, seat) => {
      return seat.tricksWon.some((t) => t.number >= game.tricksToPlay - 3);
    },
    isCompletable: () => {
      return true;
    },
  },

  display: {
    renderStatus: (game, seat) => {
      const met = BarlimanButterbur.objective.check(game, seat);
      const completable = BarlimanButterbur.objective.isCompletable(game, seat);
      return game.displaySimple(met, completable);
    },
  },
};

const BillThePony: CharacterDefinition = {
  name: "Bill the Pony",
  setupText: "Exchange simultaneously with Sam and Frodo",

  setup: async (game, seat, setupContext) => {
    // Check if already exchanged (in 1-player mode, this counts as Bill's one exchange)
    if (setupContext.exchangeMade) {
      return;
    }

    // Find Sam and Frodo
    const samSeat = game.seats.find((s) => s.character === "Sam");
    const frodoSeat = game.seats.find((s) => s.character === "Frodo");

    if (!samSeat || !frodoSeat) {
      throw new Error("Bill the Pony requires both Sam and Frodo in the game");
    }

    // Phase 1: All three players choose cards simultaneously
    const billToSam = await seat.controller.chooseCard({
      title: `${seat.character} - Exchange with Sam`,
      message: "Choose a card to give to Sam",
      cards: sortHand(seat.hand!.getAvailableCards()),
    });

    const billToFrodo = await seat.controller.chooseCard({
      title: `${seat.character} - Exchange with Frodo`,
      message: "Choose a card to give to Frodo",
      cards: sortHand(
        seat.hand!.getAvailableCards().filter((c) => c !== billToSam),
      ),
    });

    const samToBill = await samSeat.controller.chooseCard({
      title: `${samSeat.character} - Exchange with Bill`,
      message: "Choose a card to give to Bill the Pony",
      cards: sortHand(samSeat.hand!.getAvailableCards()),
    });

    const frodoToBill = await frodoSeat.controller.chooseCard({
      title: `${frodoSeat.character} - Exchange with Bill`,
      message: "Choose a card to give to Bill the Pony",
      cards: sortHand(frodoSeat.hand!.getAvailableCards()),
    });

    // Phase 2: Execute all exchanges simultaneously
    seat.hand!.removeCard(billToSam);
    seat.hand!.removeCard(billToFrodo);
    samSeat.hand!.removeCard(samToBill);
    frodoSeat.hand!.removeCard(frodoToBill);

    seat.hand!.addCard(samToBill);
    seat.hand!.addCard(frodoToBill);
    samSeat.hand!.addCard(billToSam);
    frodoSeat.hand!.addCard(billToFrodo);

    // Log all exchanges
    game.log(
      `${seat.getDisplayName()} gives ${billToSam.value} of ${billToSam.suit} to ${samSeat.getDisplayName()}`,
    );
    game.log(
      `${samSeat.getDisplayName()} gives ${samToBill.value} of ${samToBill.suit} to ${seat.getDisplayName()}`,
    );
    game.log(
      `${seat.getDisplayName()} gives ${billToFrodo.value} of ${billToFrodo.suit} to ${frodoSeat.getDisplayName()}`,
    );
    game.log(
      `${frodoSeat.getDisplayName()} gives ${frodoToBill.value} of ${frodoToBill.suit} to ${seat.getDisplayName()}`,
    );

    game.refreshDisplay();

    // Mark exchanges as made for all three participants
    setupContext.exchangeMade = true;
  },

  objective: {
    text: "Win exactly one trick",
    check: (_game, seat) => seat.getTrickCount() === 1,
    isCompletable: (_game, seat) => seat.getTrickCount() <= 1,
  },

  display: {
    renderStatus: (game, seat) => {
      const met = BillThePony.objective.check(game, seat);
      const completable = BillThePony.objective.isCompletable(game, seat);
      return game.displaySimple(met, completable);
    },
  },
};

const Elrond: CharacterDefinition = {
  name: "Elrond",
  setupText: "Everyone simultaneously passes 1 card to the right",

  setup: async (game, _seat, _setupContext) => {
    // Phase 1: All players choose cards simultaneously
    const cardsToPass: Card[] = [];
    for (let i = 0; i < game.seats.length; i++) {
      const seat = game.seats[i];
      const availableCards = seat.hand!.getAvailableCards();

      const card = await seat.controller.chooseCard({
        title: `${seat.character} - Pass to Right`,
        message: "Choose a card to pass to the player on your right",
        cards: availableCards,
      });
      cardsToPass.push(card);
    }

    // Phase 2: Execute all transfers simultaneously
    for (let i = 0; i < game.seats.length; i++) {
      game.seats[i].hand!.removeCard(cardsToPass[i]);
    }
    for (let i = 0; i < game.seats.length; i++) {
      const toSeat = game.seats[(i + 1) % game.seats.length];
      toSeat.hand!.addCard(cardsToPass[i]);
    }

    game.log("Everyone passes a card to the right");
    game.refreshDisplay();
  },

  objective: {
    text: "Every character must win a ring card",
    check: (game, _seat) => {
      // Check that every seat has won at least one ring card
      return game.seats.every((s: Seat) => {
        const ringCards = s.getAllWonCards().filter((c) => c.suit === "rings");
        return ringCards.length >= 1;
      });
    },
    isCompletable: (game, _seat) => {
      // Count how many seats still need a ring card
      const seatsNeedingRing = game.seats.filter((s: Seat) => {
        const ringCards = s.getAllWonCards().filter((c) => c.suit === "rings");
        return ringCards.length === 0;
      }).length;

      // Count how many ring cards are still available
      const totalRingCardsWon = game.seats.reduce(
        (total: number, s: Seat) =>
          total + s.getAllWonCards().filter((c) => c.suit === "rings").length,
        0,
      );
      const ringsRemaining = 5 - totalRingCardsWon;

      // Can still complete if there are at least as many rings remaining as seats needing them
      return ringsRemaining >= seatsNeedingRing;
    },
  },

  display: {
    renderStatus: (game, seat) => {
      const seatsWithRings = game.seats.filter((s: Seat) => {
        const ringCards = s.getAllWonCards().filter((c) => c.suit === "rings");
        return ringCards.length >= 1;
      }).length;

      const met = Elrond.objective.check(game, seat);
      const completable = Elrond.objective.isCompletable(game, seat);
      const icon = game.displaySimple(met, completable);

      return `${icon} Seats with rings: ${seatsWithRings}/${game.seats.length}`;
    },
  },
};

const Arwen: CharacterDefinition = {
  name: "Arwen",
  setupText: "Exchange with Elrond or Aragorn",

  setup: async (game, seat, setupContext) => {
    await game.exchange(seat, setupContext, (c: string) =>
      ["Elrond", "Aragorn"].includes(c),
    );
  },

  objective: {
    text: "Win the most forests cards",
    check: (game, seat) => {
      const myCounts = seat
        .getAllWonCards()
        .filter((c) => c.suit === "forests").length;

      // Check if this seat has strictly more than all others
      return game.seats.every((s: Seat) => {
        if (s.seatIndex === seat.seatIndex) return true;
        const theirCounts = s
          .getAllWonCards()
          .filter((c) => c.suit === "forests").length;
        return myCounts > theirCounts;
      });
    },
    isCompletable: (game, seat) => {
      const myCounts = seat
        .getAllWonCards()
        .filter((c) => c.suit === "forests").length;

      // Count forests cards won by others
      const othersMaxCounts = Math.max(
        ...game.seats
          .filter((s: Seat) => s.seatIndex !== seat.seatIndex)
          .map(
            (s: Seat) =>
              s.getAllWonCards().filter((c) => c.suit === "forests").length,
          ),
      );

      // Count forests cards remaining
      const totalForestsWon = game.seats.reduce(
        (total: number, s: Seat) =>
          total + s.getAllWonCards().filter((c) => c.suit === "forests").length,
        0,
      );
      const forestsRemaining = 8 - totalForestsWon;

      // Can complete if: my current + all remaining > others' max
      return myCounts + forestsRemaining > othersMaxCounts;
    },
  },

  display: {
    renderStatus: (game, seat) => {
      const myCounts = seat
        .getAllWonCards()
        .filter((c) => c.suit === "forests").length;
      const met = Arwen.objective.check(game, seat);
      const completable = Arwen.objective.isCompletable(game, seat);
      const icon = game.displaySimple(met, completable);

      return `${icon} Forests: ${myCounts}`;
    },
  },
};

const Gloin: CharacterDefinition = {
  name: "Gloin",
  setupText: "Exchange with Bilbo or Gimli",

  setup: async (game, seat, setupContext) => {
    await game.exchange(seat, setupContext, (c: string) =>
      ["Bilbo Baggins", "Gimli"].includes(c),
    );
  },

  objective: {
    text: "Win the most mountains cards",
    check: (game, seat) => {
      const myCounts = seat
        .getAllWonCards()
        .filter((c) => c.suit === "mountains").length;

      // Check if this seat has strictly more than all others
      return game.seats.every((s: Seat) => {
        if (s.seatIndex === seat.seatIndex) return true;
        const theirCounts = s
          .getAllWonCards()
          .filter((c) => c.suit === "mountains").length;
        return myCounts > theirCounts;
      });
    },
    isCompletable: (game, seat) => {
      const myCounts = seat
        .getAllWonCards()
        .filter((c) => c.suit === "mountains").length;

      // Count mountains cards won by others
      const othersMaxCounts = Math.max(
        ...game.seats
          .filter((s: Seat) => s.seatIndex !== seat.seatIndex)
          .map(
            (s: Seat) =>
              s.getAllWonCards().filter((c) => c.suit === "mountains").length,
          ),
      );

      // Count mountains cards remaining
      const totalMountainsWon = game.seats.reduce(
        (total: number, s: Seat) =>
          total +
          s.getAllWonCards().filter((c) => c.suit === "mountains").length,
        0,
      );
      const mountainsRemaining = 8 - totalMountainsWon;

      // Can complete if: my current + all remaining > others' max
      return myCounts + mountainsRemaining > othersMaxCounts;
    },
  },

  display: {
    renderStatus: (game, seat) => {
      const myCounts = seat
        .getAllWonCards()
        .filter((c) => c.suit === "mountains").length;
      const met = Gloin.objective.check(game, seat);
      const completable = Gloin.objective.isCompletable(game, seat);
      const icon = game.displaySimple(met, completable);

      return `${icon} Mountains: ${myCounts}`;
    },
  },
};

const BilboBaggins: CharacterDefinition = {
  name: "Bilbo Baggins",
  setupText: "No setup action",

  setup: async (_game, _seat, _setupContext) => {
    // No setup action
    // TODO: Implement "choose next leader" mechanic during trick-taking
    // When Bilbo wins a trick, he may choose who leads the next trick
  },

  objective: {
    text: "Win 3 or more tricks; do NOT win the 1 of Rings",
    check: (game, seat) => {
      const trickCount = seat.getTrickCount();
      const hasOneRing = game.hasCard(seat, "rings", 1);
      return trickCount >= 3 && !hasOneRing;
    },
    isCompletable: (game, seat) => {
      // Impossible if already has 1 of Rings
      return !game.hasCard(seat, "rings", 1);
    },
  },

  display: {
    renderStatus: (game, seat) => {
      const trickCount = seat.getTrickCount();
      const hasOneRing = game.hasCard(seat, "rings", 1);
      const met = BilboBaggins.objective.check(game, seat);
      const completable = BilboBaggins.objective.isCompletable(game, seat);
      const icon = game.displaySimple(met, completable);

      const tricksIcon = trickCount >= 3 ? "✓" : `${trickCount}/3`;
      const oneRingIcon = hasOneRing ? "✗ (has 1-Ring)" : "✓";
      return `${icon} Tricks: ${tricksIcon}, 1-Ring: ${oneRingIcon}`;
    },
  },
};

const Gwaihir: CharacterDefinition = {
  name: "Gwaihir",
  setupText: "Exchange with Gandalf twice",

  setup: async (game, seat, setupContext) => {
    await game.exchange(seat, setupContext, (c: string) => c === "Gandalf");
    await game.exchange(seat, setupContext, (c: string) => c === "Gandalf");
  },

  objective: {
    text: "Win at least two tricks containing a mountain card",
    check: (_game, seat) => {
      const tricksWithMountains = seat.tricksWon.filter((trick) =>
        trick.cards.some((c) => c.suit === "mountains"),
      );
      return tricksWithMountains.length >= 2;
    },
    isCompletable: (_game, _seat) => {
      // Hard to determine without knowing remaining mountains distribution
      // Simplified: always completable
      return true;
    },
  },

  display: {
    renderStatus: (game, seat) => {
      const tricksWithMountains = seat.tricksWon.filter((trick) =>
        trick.cards.some((c) => c.suit === "mountains"),
      );
      const met = Gwaihir.objective.check(game, seat);
      const completable = Gwaihir.objective.isCompletable(game, seat);
      const icon = game.displaySimple(met, completable);

      return `${icon} Tricks with mountains: ${tricksWithMountains.length}/2`;
    },
  },
};

const Shadowfax: CharacterDefinition = {
  name: "Shadowfax",
  setupText:
    "Set one card aside (may return it to hand at any point, must return if hand empty)",

  setup: async (_game, _seat, _setupContext) => {
    // TODO: Implement card aside mechanic
    // This requires tracking a "set aside" card that can be returned to hand
    // For now, no action taken
  },

  objective: {
    text: "Win at least two tricks containing a hills card",
    check: (_game, seat) => {
      const tricksWithHills = seat.tricksWon.filter((trick) =>
        trick.cards.some((c) => c.suit === "hills"),
      );
      return tricksWithHills.length >= 2;
    },
    isCompletable: (_game, _seat) => {
      // Hard to determine without knowing remaining hills distribution
      // Simplified: always completable
      return true;
    },
  },

  display: {
    renderStatus: (game, seat) => {
      const tricksWithHills = seat.tricksWon.filter((trick) =>
        trick.cards.some((c) => c.suit === "hills"),
      );
      const met = Shadowfax.objective.check(game, seat);
      const completable = Shadowfax.objective.isCompletable(game, seat);
      const icon = game.displaySimple(met, completable);

      return `${icon} Tricks with hills: ${tricksWithHills.length}/2`;
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
  [BarlimanButterbur.name, BarlimanButterbur],
  [BillThePony.name, BillThePony],
  [Elrond.name, Elrond],
  [Arwen.name, Arwen],
  [Gloin.name, Gloin],
  [BilboBaggins.name, BilboBaggins],
  [Gwaihir.name, Gwaihir],
  [Shadowfax.name, Shadowfax],
]);

export const allCharacterNames = Array.from(characterRegistry.keys());
