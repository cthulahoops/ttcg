import { describe, expect, test } from "bun:test";
import { BilboBaggins } from "./bilbo-baggins";
import { Game } from "../game";
import { Seat } from "../seat";
import { PlayerHand } from "../hands";
import { Controller } from "../controllers";
import type { Card } from "../types";

// Test helper: create a minimal controller for testing
class TestController extends Controller {
  async chooseButton<T>(): Promise<T> {
    throw new Error("Not implemented in test");
  }
  async chooseCard<T>(): Promise<T> {
    throw new Error("Not implemented in test");
  }
  async selectCard(): Promise<Card> {
    throw new Error("Not implemented in test");
  }
}

// Test helper: create a game with the specified number of characters
function createTestGame(numCharacters: number): Game {
  const seats: Seat[] = [];
  for (let i = 0; i < numCharacters; i++) {
    const controller = new TestController();
    const hand = new PlayerHand();
    seats.push(new Seat(i, controller, hand, false));
  }
  const lostCard: Card = { suit: "mountains", value: 1 };
  return new Game(numCharacters, numCharacters, seats, lostCard, 0);
}

// Test helper: add won cards to a seat
function addWonCards(seat: Seat, cards: Card[]): void {
  seat.addTrick(seat.tricksWon.length, cards);
}

describe("Bilbo Baggins", () => {
  describe("objective.check", () => {
    test("returns false when no tricks won", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      expect(BilboBaggins.objective.check(game, seat)).toBe(false);
    });

    test("returns false when only 2 tricks won", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      addWonCards(seat, [{ suit: "mountains", value: 1 }]);
      addWonCards(seat, [{ suit: "forests", value: 2 }]);
      expect(BilboBaggins.objective.check(game, seat)).toBe(false);
    });

    test("returns true when exactly 3 tricks won without 1 of Rings", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      addWonCards(seat, [{ suit: "mountains", value: 1 }]);
      addWonCards(seat, [{ suit: "forests", value: 2 }]);
      addWonCards(seat, [{ suit: "hills", value: 3 }]);
      expect(BilboBaggins.objective.check(game, seat)).toBe(true);
    });

    test("returns true when more than 3 tricks won without 1 of Rings", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      addWonCards(seat, [{ suit: "mountains", value: 1 }]);
      addWonCards(seat, [{ suit: "forests", value: 2 }]);
      addWonCards(seat, [{ suit: "hills", value: 3 }]);
      addWonCards(seat, [{ suit: "shadows", value: 4 }]);
      expect(BilboBaggins.objective.check(game, seat)).toBe(true);
    });

    test("returns false when 3+ tricks won but has 1 of Rings", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      addWonCards(seat, [{ suit: "rings", value: 1 }]); // The 1 of Rings
      addWonCards(seat, [{ suit: "forests", value: 2 }]);
      addWonCards(seat, [{ suit: "hills", value: 3 }]);
      expect(BilboBaggins.objective.check(game, seat)).toBe(false);
    });

    test("returns true when has other ring cards but not 1 of Rings", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      addWonCards(seat, [{ suit: "rings", value: 2 }]); // Not the 1 of Rings
      addWonCards(seat, [{ suit: "rings", value: 3 }]);
      addWonCards(seat, [{ suit: "hills", value: 3 }]);
      expect(BilboBaggins.objective.check(game, seat)).toBe(true);
    });
  });

  describe("objective.isCompletable", () => {
    test("returns false when already has 1 of Rings", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      addWonCards(seat, [{ suit: "rings", value: 1 }]);
      expect(BilboBaggins.objective.isCompletable(game, seat)).toBe(false);
    });

    test("returns true when no tricks won and game is just starting", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      expect(BilboBaggins.objective.isCompletable(game, seat)).toBe(true);
    });

    test("returns true when 2 tricks won and remaining tricks allow reaching 3", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      addWonCards(seat, [{ suit: "mountains", value: 1 }]);
      addWonCards(seat, [{ suit: "forests", value: 2 }]);
      // tricksRemaining() = tricksToPlay - currentTrickNumber = 9 - 0 = 9
      expect(BilboBaggins.objective.isCompletable(game, seat)).toBe(true);
    });

    test("returns false when not enough tricks remaining to reach 3", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      // Simulate that most tricks have been played
      game.currentTrickNumber = 8; // Only 1 trick remaining (9 - 8 = 1)
      // With 0 tricks won and 1 remaining, max possible = 1 which is < 3
      expect(BilboBaggins.objective.isCompletable(game, seat)).toBe(false);
    });

    test("returns true when already have 3 tricks without 1 of Rings", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      addWonCards(seat, [{ suit: "mountains", value: 1 }]);
      addWonCards(seat, [{ suit: "forests", value: 2 }]);
      addWonCards(seat, [{ suit: "hills", value: 3 }]);
      expect(BilboBaggins.objective.isCompletable(game, seat)).toBe(true);
    });
  });

  describe("objective.isCompleted", () => {
    test("returns false when objective not met even if game finished", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      // Clear all hands to simulate game finished
      for (const s of game.seats) {
        s.hand = new PlayerHand(); // Empty hand
      }
      expect(BilboBaggins.objective.isCompleted(game, seat)).toBe(false);
    });

    test("returns true when objective met and game finished", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      addWonCards(seat, [{ suit: "mountains", value: 1 }]);
      addWonCards(seat, [{ suit: "forests", value: 2 }]);
      addWonCards(seat, [{ suit: "hills", value: 3 }]);
      // Clear all hands to simulate game finished
      for (const s of game.seats) {
        s.hand = new PlayerHand(); // Empty hand
      }
      expect(BilboBaggins.objective.isCompleted(game, seat)).toBe(true);
    });

    test("returns true when objective met and 1 of Rings won by another player", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      const otherSeat = game.seats[1]!;
      addWonCards(seat, [{ suit: "mountains", value: 1 }]);
      addWonCards(seat, [{ suit: "forests", value: 2 }]);
      addWonCards(seat, [{ suit: "hills", value: 3 }]);
      addWonCards(otherSeat, [{ suit: "rings", value: 1 }]); // Other player has 1 of Rings
      // Game not finished - players still have cards
      seat.hand.addCard({ suit: "shadows", value: 5 });
      otherSeat.hand.addCard({ suit: "shadows", value: 6 });
      expect(BilboBaggins.objective.isCompleted(game, seat)).toBe(true);
    });

    test("returns false when objective met but 1 of Rings still in play", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      addWonCards(seat, [{ suit: "mountains", value: 1 }]);
      addWonCards(seat, [{ suit: "forests", value: 2 }]);
      addWonCards(seat, [{ suit: "hills", value: 3 }]);
      // Game not finished - players still have cards (1 of Rings still in play)
      seat.hand.addCard({ suit: "shadows", value: 5 });
      game.seats[1]!.hand.addCard({ suit: "shadows", value: 6 });
      expect(BilboBaggins.objective.isCompleted(game, seat)).toBe(false);
    });
  });

  describe("display.renderStatus", () => {
    test("shows correct status when no tricks won", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      const status = BilboBaggins.display.renderStatus(game, seat);
      expect(status.details).toBe("Tricks: 0/3, 1-Ring: ✓");
      expect(status.met).toBe(false);
      expect(status.completable).toBe(true);
    });

    test("shows tricks count correctly when partially complete", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      addWonCards(seat, [{ suit: "mountains", value: 1 }]);
      addWonCards(seat, [{ suit: "forests", value: 2 }]);
      const status = BilboBaggins.display.renderStatus(game, seat);
      expect(status.details).toBe("Tricks: 2/3, 1-Ring: ✓");
      expect(status.met).toBe(false);
    });

    test("shows checkmark when 3+ tricks won", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      addWonCards(seat, [{ suit: "mountains", value: 1 }]);
      addWonCards(seat, [{ suit: "forests", value: 2 }]);
      addWonCards(seat, [{ suit: "hills", value: 3 }]);
      const status = BilboBaggins.display.renderStatus(game, seat);
      expect(status.details).toBe("Tricks: ✓, 1-Ring: ✓");
      expect(status.met).toBe(true);
    });

    test("shows failure status when has 1 of Rings", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      addWonCards(seat, [{ suit: "rings", value: 1 }]);
      addWonCards(seat, [{ suit: "forests", value: 2 }]);
      addWonCards(seat, [{ suit: "hills", value: 3 }]);
      const status = BilboBaggins.display.renderStatus(game, seat);
      expect(status.details).toBe("Tricks: ✓, 1-Ring: ✗ (has 1-Ring)");
      expect(status.met).toBe(false);
      expect(status.completable).toBe(false);
    });

    test("shows completed status when objective met and game finished", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      addWonCards(seat, [{ suit: "mountains", value: 1 }]);
      addWonCards(seat, [{ suit: "forests", value: 2 }]);
      addWonCards(seat, [{ suit: "hills", value: 3 }]);
      // Clear all hands to simulate game finished
      for (const s of game.seats) {
        s.hand = new PlayerHand(); // Empty hand
      }
      const status = BilboBaggins.display.renderStatus(game, seat);
      expect(status.completed).toBe(true);
    });
  });

  describe("setup", () => {
    test("is a no-op function", async () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      // Should not throw and should complete
      await BilboBaggins.setup(game, seat, { frodoSeat: seat });
      // Verify nothing changed
      expect(seat.tricksWon.length).toBe(0);
    });
  });

  describe("metadata", () => {
    test("has correct name", () => {
      expect(BilboBaggins.name).toBe("Bilbo Baggins");
    });

    test("has correct setupText", () => {
      expect(BilboBaggins.setupText).toBe("No setup action");
    });

    test("has correct objective text", () => {
      expect(BilboBaggins.objective.text).toBe(
        "Win 3 or more tricks; do NOT win the 1 of Rings"
      );
    });
  });
});
