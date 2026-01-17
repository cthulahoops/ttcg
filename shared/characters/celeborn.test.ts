import { describe, expect, test } from "bun:test";
import { Celeborn } from "./celeborn";
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

describe("Celeborn", () => {
  describe("objective.check", () => {
    test("returns false when no cards won", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      expect(Celeborn.objective.check(game, seat)).toBe(false);
    });

    test("returns false when no rank has 3 cards", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      addWonCards(seat, [
        { suit: "mountains", value: 1 },
        { suit: "shadows", value: 1 },
        { suit: "forests", value: 2 },
        { suit: "hills", value: 2 },
      ]);
      expect(Celeborn.objective.check(game, seat)).toBe(false);
    });

    test("returns true when exactly 3 cards of same rank", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      addWonCards(seat, [
        { suit: "mountains", value: 5 },
        { suit: "shadows", value: 5 },
        { suit: "forests", value: 5 },
      ]);
      expect(Celeborn.objective.check(game, seat)).toBe(true);
    });

    test("returns true when 4 cards of same rank", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      addWonCards(seat, [
        { suit: "mountains", value: 3 },
        { suit: "shadows", value: 3 },
        { suit: "forests", value: 3 },
        { suit: "hills", value: 3 },
      ]);
      expect(Celeborn.objective.check(game, seat)).toBe(true);
    });

    test("returns true when one rank has 3+ even if others have fewer", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      addWonCards(seat, [
        { suit: "mountains", value: 2 },
        { suit: "shadows", value: 2 },
        { suit: "forests", value: 2 },
        { suit: "hills", value: 7 },
        { suit: "mountains", value: 8 },
      ]);
      expect(Celeborn.objective.check(game, seat)).toBe(true);
    });

    test("counts cards across multiple tricks", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      // Add cards in separate tricks
      addWonCards(seat, [{ suit: "mountains", value: 4 }]);
      addWonCards(seat, [{ suit: "shadows", value: 4 }]);
      addWonCards(seat, [{ suit: "forests", value: 4 }]);
      expect(Celeborn.objective.check(game, seat)).toBe(true);
    });
  });

  describe("objective.isCompletable", () => {
    test("always returns true", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      expect(Celeborn.objective.isCompletable(game, seat)).toBe(true);
    });

    test("returns true even when no cards won", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      expect(Celeborn.objective.isCompletable(game, seat)).toBe(true);
    });

    test("returns true even when objective already met", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      addWonCards(seat, [
        { suit: "mountains", value: 6 },
        { suit: "shadows", value: 6 },
        { suit: "forests", value: 6 },
      ]);
      expect(Celeborn.objective.isCompletable(game, seat)).toBe(true);
    });
  });

  describe("objective.isCompleted", () => {
    test("returns same result as check when objective not met", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      expect(Celeborn.objective.isCompleted(game, seat)).toBe(
        Celeborn.objective.check(game, seat)
      );
    });

    test("returns same result as check when objective met", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      addWonCards(seat, [
        { suit: "mountains", value: 7 },
        { suit: "shadows", value: 7 },
        { suit: "forests", value: 7 },
      ]);
      expect(Celeborn.objective.isCompleted(game, seat)).toBe(
        Celeborn.objective.check(game, seat)
      );
    });
  });

  describe("display.renderStatus", () => {
    test("shows met=false when no rank has 3 cards", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      addWonCards(seat, [
        { suit: "mountains", value: 1 },
        { suit: "shadows", value: 1 },
      ]);
      const status = Celeborn.display.renderStatus(game, seat);
      expect(status.met).toBe(false);
      expect(status.completable).toBe(true);
    });

    test("shows met=true when objective is met", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      addWonCards(seat, [
        { suit: "mountains", value: 8 },
        { suit: "shadows", value: 8 },
        { suit: "forests", value: 8 },
      ]);
      const status = Celeborn.display.renderStatus(game, seat);
      expect(status.met).toBe(true);
      expect(status.completed).toBe(true);
    });

    test("shows details for ranks with 2+ cards", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      addWonCards(seat, [
        { suit: "mountains", value: 3 },
        { suit: "shadows", value: 3 },
        { suit: "forests", value: 5 },
        { suit: "hills", value: 5 },
      ]);
      const status = Celeborn.display.renderStatus(game, seat);
      expect(status.details).toContain("3:2");
      expect(status.details).toContain("5:2");
    });

    test("shows details with 3+ count when objective met", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      addWonCards(seat, [
        { suit: "mountains", value: 4 },
        { suit: "shadows", value: 4 },
        { suit: "forests", value: 4 },
      ]);
      const status = Celeborn.display.renderStatus(game, seat);
      expect(status.details).toBe("4:3");
    });

    test("shows undefined details when no rank has 2+ cards", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      addWonCards(seat, [
        { suit: "mountains", value: 1 },
        { suit: "shadows", value: 2 },
        { suit: "forests", value: 3 },
      ]);
      const status = Celeborn.display.renderStatus(game, seat);
      expect(status.details).toBeUndefined();
    });

    test("shows undefined details when no cards won", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      const status = Celeborn.display.renderStatus(game, seat);
      expect(status.details).toBeUndefined();
    });
  });

  describe("metadata", () => {
    test("has correct name", () => {
      expect(Celeborn.name).toBe("Celeborn");
    });

    test("has correct setupText", () => {
      expect(Celeborn.setupText).toBe("Exchange with any player");
    });

    test("has correct objective text", () => {
      expect(Celeborn.objective.text).toBe(
        "Win at least three cards of the same rank"
      );
    });
  });
});
