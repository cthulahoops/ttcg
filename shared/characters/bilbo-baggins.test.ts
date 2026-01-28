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
  describe("objective.getStatus", () => {
    test("returns { tentative, failure } when no tricks won", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      // Add cards to hands so game is not finished
      for (const s of game.seats) {
        s.hand.addCard({ suit: "forests", value: s.seatIndex + 1 });
      }
      expect(BilboBaggins.objective.getStatus(game, seat)).toEqual({
        finality: "tentative",
        outcome: "failure",
      });
    });

    test("returns { tentative, failure } when only 2 tricks won", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      // Add cards to hands so game is not finished
      for (const s of game.seats) {
        s.hand.addCard({ suit: "forests", value: s.seatIndex + 1 });
      }
      addWonCards(seat, [{ suit: "mountains", value: 1 }]);
      addWonCards(seat, [{ suit: "forests", value: 2 }]);
      expect(BilboBaggins.objective.getStatus(game, seat)).toEqual({
        finality: "tentative",
        outcome: "failure",
      });
    });

    test("returns { tentative, success } when exactly 3 tricks won without 1 of Rings (1-ring still in play)", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      // Add cards to hands so game is not finished and 1-ring still in play
      for (const s of game.seats) {
        s.hand.addCard({ suit: "forests", value: s.seatIndex + 1 });
      }
      addWonCards(seat, [{ suit: "mountains", value: 1 }]);
      addWonCards(seat, [{ suit: "forests", value: 2 }]);
      addWonCards(seat, [{ suit: "hills", value: 3 }]);
      expect(BilboBaggins.objective.getStatus(game, seat)).toEqual({
        finality: "tentative",
        outcome: "success",
      });
    });

    test("returns { final, success } when 3+ tricks won and game finished", () => {
      const game = createTestGame(4);
      game.currentTrickNumber = game.tricksToPlay; // Mark game as finished
      const seat = game.seats[0]!;
      addWonCards(seat, [{ suit: "mountains", value: 1 }]);
      addWonCards(seat, [{ suit: "forests", value: 2 }]);
      addWonCards(seat, [{ suit: "hills", value: 3 }]);
      addWonCards(game.seats[1]!, [{ suit: "rings", value: 1 }]);
      expect(BilboBaggins.objective.getStatus(game, seat)).toEqual({
        finality: "final",
        outcome: "success",
      });
    });

    test("returns { final, success } when 3+ tricks won and 1 of Rings won by another", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      const otherSeat = game.seats[1]!;
      // Add cards to hands so game is not finished
      for (const s of game.seats) {
        s.hand.addCard({ suit: "forests", value: s.seatIndex + 1 });
      }
      addWonCards(seat, [{ suit: "mountains", value: 1 }]);
      addWonCards(seat, [{ suit: "forests", value: 2 }]);
      addWonCards(seat, [{ suit: "hills", value: 3 }]);
      addWonCards(otherSeat, [{ suit: "rings", value: 1 }]); // Other player has 1 of Rings
      expect(BilboBaggins.objective.getStatus(game, seat)).toEqual({
        finality: "final",
        outcome: "success",
      });
    });

    test("returns { final, failure } when has 1 of Rings", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      addWonCards(seat, [{ suit: "rings", value: 1 }]); // The 1 of Rings
      addWonCards(seat, [{ suit: "forests", value: 2 }]);
      addWonCards(seat, [{ suit: "hills", value: 3 }]);
      expect(BilboBaggins.objective.getStatus(game, seat)).toEqual({
        finality: "final",
        outcome: "failure",
      });
    });

    test("returns { final, failure } when not enough tricks remaining to reach 3", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      // Simulate that most tricks have been played
      game.currentTrickNumber = 8; // Only 1 trick remaining (9 - 8 = 1)
      // With 0 tricks won and 1 remaining, max possible = 1 which is < 3
      expect(BilboBaggins.objective.getStatus(game, seat)).toEqual({
        finality: "final",
        outcome: "failure",
      });
    });

    test("returns { tentative, success } when has other ring cards but not 1 of Rings", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      // Add cards to hands so game is not finished
      for (const s of game.seats) {
        s.hand.addCard({ suit: "forests", value: s.seatIndex + 1 });
      }
      addWonCards(seat, [{ suit: "rings", value: 2 }]); // Not the 1 of Rings
      addWonCards(seat, [{ suit: "rings", value: 3 }]);
      addWonCards(seat, [{ suit: "hills", value: 3 }]);
      expect(BilboBaggins.objective.getStatus(game, seat)).toEqual({
        finality: "tentative",
        outcome: "success",
      });
    });
  });

  describe("objective.getDetails", () => {
    test("shows correct status when no tricks won", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      expect(BilboBaggins.objective.getDetails!(game, seat)).toBe(
        "Tricks: 0/3, 1-Ring: ✓"
      );
    });

    test("shows tricks count correctly when partially complete", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      addWonCards(seat, [{ suit: "mountains", value: 1 }]);
      addWonCards(seat, [{ suit: "forests", value: 2 }]);
      expect(BilboBaggins.objective.getDetails!(game, seat)).toBe(
        "Tricks: 2/3, 1-Ring: ✓"
      );
    });

    test("shows checkmark when 3+ tricks won", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      addWonCards(seat, [{ suit: "mountains", value: 1 }]);
      addWonCards(seat, [{ suit: "forests", value: 2 }]);
      addWonCards(seat, [{ suit: "hills", value: 3 }]);
      expect(BilboBaggins.objective.getDetails!(game, seat)).toBe(
        "Tricks: ✓, 1-Ring: ✓"
      );
    });

    test("shows failure status when has 1 of Rings", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      addWonCards(seat, [{ suit: "rings", value: 1 }]);
      addWonCards(seat, [{ suit: "forests", value: 2 }]);
      addWonCards(seat, [{ suit: "hills", value: 3 }]);
      expect(BilboBaggins.objective.getDetails!(game, seat)).toBe(
        "Tricks: ✓, 1-Ring: ✗ (has 1-Ring)"
      );
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
