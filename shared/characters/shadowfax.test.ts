import { describe, expect, test } from "bun:test";
import { Shadowfax } from "./shadowfax";
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
  const lostCard: Card = { suit: "forests", value: 1 };
  return new Game(numCharacters, numCharacters, seats, lostCard, 0);
}

// Test helper: add won cards to a seat
function addWonCards(seat: Seat, cards: Card[]): void {
  seat.addTrick(seat.tricksWon.length, cards);
}

describe("Shadowfax", () => {
  describe("objective.check", () => {
    test("returns false when no tricks have been won", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      expect(Shadowfax.objective.check(game, seat)).toBe(false);
    });

    test("returns false when won tricks have no hills cards", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      addWonCards(seat, [
        { suit: "forests", value: 3 },
        { suit: "mountains", value: 5 },
      ]);
      addWonCards(seat, [
        { suit: "shadows", value: 2 },
        { suit: "rings", value: 1 },
      ]);
      expect(Shadowfax.objective.check(game, seat)).toBe(false);
    });

    test("returns false when only 1 trick contains a hills card", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      addWonCards(seat, [
        { suit: "hills", value: 4 },
        { suit: "forests", value: 2 },
      ]);
      addWonCards(seat, [
        { suit: "shadows", value: 3 },
        { suit: "mountains", value: 6 },
      ]);
      expect(Shadowfax.objective.check(game, seat)).toBe(false);
    });

    test("returns true when exactly 2 tricks contain hills cards", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      addWonCards(seat, [
        { suit: "hills", value: 4 },
        { suit: "forests", value: 2 },
      ]);
      addWonCards(seat, [
        { suit: "hills", value: 7 },
        { suit: "mountains", value: 1 },
      ]);
      expect(Shadowfax.objective.check(game, seat)).toBe(true);
    });

    test("returns true when more than 2 tricks contain hills cards", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      addWonCards(seat, [{ suit: "hills", value: 1 }]);
      addWonCards(seat, [{ suit: "hills", value: 2 }]);
      addWonCards(seat, [{ suit: "hills", value: 3 }]);
      expect(Shadowfax.objective.check(game, seat)).toBe(true);
    });

    test("counts multiple hills in one trick as one trick with hills", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      // One trick with 3 hills cards - only counts as 1 trick
      addWonCards(seat, [
        { suit: "hills", value: 1 },
        { suit: "hills", value: 2 },
        { suit: "hills", value: 3 },
      ]);
      expect(Shadowfax.objective.check(game, seat)).toBe(false);
    });
  });

  describe("objective.isCompletable", () => {
    test("always returns true (simplified implementation)", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      expect(Shadowfax.objective.isCompletable(game, seat)).toBe(true);
    });

    test("returns true even when no tricks won yet", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      expect(Shadowfax.objective.isCompletable(game, seat)).toBe(true);
    });

    test("returns true even with multiple non-hills tricks", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      addWonCards(seat, [{ suit: "forests", value: 1 }]);
      addWonCards(seat, [{ suit: "mountains", value: 2 }]);
      addWonCards(seat, [{ suit: "shadows", value: 3 }]);
      expect(Shadowfax.objective.isCompletable(game, seat)).toBe(true);
    });
  });

  describe("objective.isCompleted", () => {
    test("returns false when objective not met", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      addWonCards(seat, [{ suit: "hills", value: 1 }]);
      expect(Shadowfax.objective.isCompleted(game, seat)).toBe(false);
    });

    test("returns true when objective is met (delegates to check)", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      addWonCards(seat, [{ suit: "hills", value: 1 }]);
      addWonCards(seat, [{ suit: "hills", value: 2 }]);
      expect(Shadowfax.objective.isCompleted(game, seat)).toBe(true);
    });
  });

  describe("display.renderStatus", () => {
    test("shows met=false when less than 2 tricks with hills", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      addWonCards(seat, [{ suit: "hills", value: 1 }]);
      const status = Shadowfax.display.renderStatus(game, seat);
      expect(status.met).toBe(false);
    });

    test("shows met=true when 2+ tricks with hills", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      addWonCards(seat, [{ suit: "hills", value: 1 }]);
      addWonCards(seat, [{ suit: "hills", value: 2 }]);
      const status = Shadowfax.display.renderStatus(game, seat);
      expect(status.met).toBe(true);
    });

    test("shows completable=true (always completable)", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      const status = Shadowfax.display.renderStatus(game, seat);
      expect(status.completable).toBe(true);
    });

    test("shows completed=false when objective not met", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      const status = Shadowfax.display.renderStatus(game, seat);
      expect(status.completed).toBe(false);
    });

    test("shows completed=true when objective met", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      addWonCards(seat, [{ suit: "hills", value: 1 }]);
      addWonCards(seat, [{ suit: "hills", value: 2 }]);
      const status = Shadowfax.display.renderStatus(game, seat);
      expect(status.completed).toBe(true);
    });

    test("shows correct details with trick count", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      const status = Shadowfax.display.renderStatus(game, seat);
      expect(status.details).toBe("Tricks with hills: 0/2");
    });

    test("shows correct details with 1 trick with hills", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      addWonCards(seat, [{ suit: "hills", value: 5 }]);
      const status = Shadowfax.display.renderStatus(game, seat);
      expect(status.details).toBe("Tricks with hills: 1/2");
    });

    test("shows correct details with 2 tricks with hills", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      addWonCards(seat, [{ suit: "hills", value: 5 }]);
      addWonCards(seat, [{ suit: "hills", value: 6 }]);
      const status = Shadowfax.display.renderStatus(game, seat);
      expect(status.details).toBe("Tricks with hills: 2/2");
    });
  });

  describe("metadata", () => {
    test("has correct name", () => {
      expect(Shadowfax.name).toBe("Shadowfax");
    });

    test("has correct setupText", () => {
      expect(Shadowfax.setupText).toBe(
        "Set one card aside (may return it to hand at any point, must return if hand empty)"
      );
    });

    test("has correct objective text", () => {
      expect(Shadowfax.objective.text).toBe(
        "Win at least two tricks containing a hills card"
      );
    });
  });
});
