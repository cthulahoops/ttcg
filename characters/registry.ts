// Character Registry
// All character definitions in one place

const Frodo = {
  name: "Frodo",
  setupText: "No setup action",

  setup: async (game, seat, setupContext) => {
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
      const othersRings = game.seats.reduce((total, s) => {
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
          .sort((a, b) => a - b)
          .join(", ");
        return `${icon} Rings: ${ringList}`;
      } else {
        return `${icon} Rings: none`;
      }
    },
  },
};

const Gandalf = {
  name: "Gandalf",
  setupText: "Optionally take the lost card, then exchange with Frodo",

  setup: async (game, seat, setupContext) => {
    await game.offerLostCard(seat);
    await game.exchange(seat, setupContext, (c) => c === "Frodo");
  },

  objective: {
    text: "Win at least one trick",
    check: (game, seat) => seat.getTrickCount() >= 1,
    isCompletable: (game, seat) => true, // Always possible
  },

  display: {
    renderStatus: (game, seat) => {
      const met = Gandalf.objective.check(game, seat);
      return game.displaySimple(met, true);
    },
  },
};

const Merry = {
  name: "Merry",
  setupText: "Exchange with Frodo, Pippin, or Sam",

  setup: async (game, seat, setupContext) => {
    await game.exchange(seat, setupContext, (c) =>
      ["Frodo", "Pippin", "Sam"].includes(c),
    );
  },

  objective: {
    text: "Win exactly one or two tricks",
    check: (game, seat) => {
      const count = seat.getTrickCount();
      return count === 1 || count === 2;
    },
    isCompletable: (game, seat) => seat.getTrickCount() < 3,
  },

  display: {
    renderStatus: (game, seat) => {
      const met = Merry.objective.check(game, seat);
      const completable = Merry.objective.isCompletable(game, seat);
      return game.displaySimple(met, completable);
    },
  },
};

const Celeborn = {
  name: "Celeborn",
  setupText: "Exchange with any player",

  setup: async (game, seat, setupContext) => {
    await game.exchange(seat, setupContext, (c) => true); // Any player
  },

  objective: {
    text: "Win at least three cards of the same rank",
    check: (game, seat) => {
      const rankCounts = {};
      seat.getAllWonCards().forEach((card) => {
        rankCounts[card.value] = (rankCounts[card.value] || 0) + 1;
      });
      return Object.values(rankCounts).some((count) => count >= 3);
    },
    isCompletable: (game, seat) => true, // Hard to determine early
  },

  display: {
    renderStatus: (game, seat) => {
      const rankCounts = {};
      seat.getAllWonCards().forEach((card) => {
        rankCounts[card.value] = (rankCounts[card.value] || 0) + 1;
      });
      const met = Celeborn.objective.check(game, seat);
      const icon = game.displaySimple(met, true);

      // Show ranks with counts >= 2
      const ranksWithCounts = Object.entries(rankCounts)
        .filter(([rank, count]) => count >= 2)
        .map(([rank, count]) => `${rank}:${count}`)
        .join(", ");

      return ranksWithCounts ? `${icon} ${ranksWithCounts}` : icon;
    },
  },
};

const Pippin = {
  name: "Pippin",
  setupText: "Exchange with Frodo, Merry, or Sam",

  setup: async (game, seat, setupContext) => {
    await game.exchange(seat, setupContext, (c) =>
      ["Frodo", "Merry", "Sam"].includes(c),
    );
  },

  objective: {
    text: "Win the fewest (or joint fewest) tricks",
    check: (game, seat) => {
      const allCounts = game.seats.map((s) => s.getTrickCount());
      const minCount = Math.min(...allCounts);
      return seat.getTrickCount() === minCount;
    },
    isCompletable: (game, seat) => {
      const allCounts = game.seats.map((s) => s.getTrickCount());
      const myCount = seat.getTrickCount();

      let totalGap = 0;
      const totalTricks = gameState.seats.length === 3 ? 12 : 9;
      let tricksPlayed = 0;
      for (const otherTricks of allCounts) {
        if (otherTricks < myCount) {
          totalGap += trickCount - otherTricks;
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

const Boromir = {
  name: "Boromir",
  setupText: "Exchange with anyone except Frodo",

  setup: async (game, seat, setupContext) => {
    await game.exchange(seat, setupContext, (c) => c !== "Frodo");
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

const Sam = {
  name: "Sam",
  threatSuit: "hills",
  setupText:
    "Draw a Hills threat card, then exchange with Frodo, Merry, or Pippin",

  setup: async (game, seat, setupContext) => {
    await game.drawThreatCard(seat, Sam.threatSuit, {
      exclude: game.lostCard?.value,
    });
    await game.exchange(seat, setupContext, (c) =>
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

const Gimli = {
  name: "Gimli",
  threatSuit: "mountains",
  setupText:
    "Draw a Mountains threat card, then exchange with Legolas or Aragorn",

  setup: async (game, seat, setupContext) => {
    await game.drawThreatCard(seat, Gimli.threatSuit, {
      exclude: game.lostCard?.value,
    });
    await game.exchange(seat, setupContext, (c) =>
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

const Legolas = {
  name: "Legolas",
  threatSuit: "forests",
  setupText: "Draw a Forests threat card, then exchange with Gimli or Aragorn",

  setup: async (game, seat, setupContext) => {
    await game.drawThreatCard(seat, Legolas.threatSuit, {
      exclude: game.lostCard?.value,
    });
    await game.exchange(seat, setupContext, (c) =>
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

const Aragorn = {
  name: "Aragorn",
  setupText: "Choose a threat card, then exchange with Gimli or Legolas",

  setup: async (game, seat, setupContext) => {
    await game.chooseThreatCard(seat);
    await game.exchange(seat, setupContext, (c) =>
      ["Gimli", "Legolas"].includes(c),
    );
  },

  objective: {
    text: "Win exactly the number of tricks shown on your threat card",
    check: (game, seat) => {
      if (!seat.threatCard) return false;
      return seat.getTrickCount() === seat.threatCard;
    },
    isCompletable: (game, seat) => {
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

const Goldberry = {
  name: "Goldberry",
  setupText: "Turn your hand face-up (visible to all players)",

  setup: async (game, seat, setupContext) => {
    game.revealHand(seat); // ⚠️ NEW API METHOD NEEDED
    // No exchange
  },

  objective: {
    text: "Win exactly three tricks in a row and no other tricks",
    check: (game, seat) => {
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
      if (trickCount > 3) return false; // Already won too many

      const trickNumbers = seat.tricksWon.map((t) => t.number);

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

const Glorfindel = {
  name: "Glorfindel",
  setupText: "Optionally take the lost card",

  setup: async (game, seat, setupContext) => {
    await game.offerLostCard(seat);
    // No exchange
  },

  objective: {
    text: "Win every Shadows card",
    check: (game, seat) => {
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

const Galadriel = {
  name: "Galadriel",
  setupText: "Exchange with either the lost card or Gandalf",

  setup: async (game, seat, setupContext) => {
    const choice = await game.choice(seat, "Exchange with?", [
      "Lost Card",
      "Gandalf",
    ]);

    if (choice === "Lost Card") {
      await game.exchangeWithLostCard(seat, setupContext); // ⚠️ NEW API METHOD NEEDED
    } else {
      await game.exchange(seat, setupContext, (c) => c === "Gandalf");
    }
  },

  objective: {
    text: "Win neither the fewest nor the most tricks",
    check: (game, seat) => {
      const allCounts = game.seats.map((s) => s.getTrickCount());
      const minCount = Math.min(...allCounts);
      const maxCount = Math.max(...allCounts);
      const myCount = seat.getTrickCount();
      return myCount !== minCount && myCount !== maxCount;
    },
    isCompletable: (game, seat) => {
      const allCounts = game.seats.map((s) => s.getTrickCount());
      const minCount = Math.min(...allCounts);
      const maxCount = Math.max(...allCounts);
      const myCount = seat.getTrickCount();

      // If we're sole min or sole max, it's impossible
      const minSeats = allCounts.filter((c) => c === minCount).length;
      const maxSeats = allCounts.filter((c) => c === maxCount).length;

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

export const characterRegistry = new Map([
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
]);

export const allCharacterNames = Array.from(characterRegistry.keys());
