import { describe, expect, test } from "bun:test";
import { Gandalf } from "./gandalf";
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

describe("Gandalf", () => {
  describe("objective.check", () => {
    test("returns false when no tricks won", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      expect(Gandalf.objective.check(game, seat)).toBe(false);
    });

    test("returns true when exactly 1 trick won", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      addWonCards(seat, [{ suit: "mountains", value: 1 }]);
      expect(Gandalf.objective.check(game, seat)).toBe(true);
    });

    test("returns true when multiple tricks won", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      addWonCards(seat, [{ suit: "mountains", value: 1 }]);
      addWonCards(seat, [{ suit: "shadows", value: 2 }]);
      addWonCards(seat, [{ suit: "forests", value: 3 }]);
      expect(Gandalf.objective.check(game, seat)).toBe(true);
    });
  });

  describe("objective.isCompletable", () => {
    test("always returns true (winning a trick is always possible)", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      expect(Gandalf.objective.isCompletable(game, seat)).toBe(true);
    });

    test("returns true even when no tricks won yet", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      expect(Gandalf.objective.isCompletable(game, seat)).toBe(true);
    });

    test("returns true when other players have won all tricks so far", () => {
      const game = createTestGame(4);
      const gandalfSeat = game.seats[0]!;
      const otherSeat = game.seats[1]!;
      // Other player has won many tricks
      addWonCards(otherSeat, [{ suit: "mountains", value: 1 }]);
      addWonCards(otherSeat, [{ suit: "shadows", value: 2 }]);
      addWonCards(otherSeat, [{ suit: "forests", value: 3 }]);
      expect(Gandalf.objective.isCompletable(game, gandalfSeat)).toBe(true);
    });
  });

  describe("objective.isCompleted", () => {
    test("returns same result as check (delegates to check)", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      expect(Gandalf.objective.isCompleted(game, seat)).toBe(
        Gandalf.objective.check(game, seat)
      );
    });

    test("returns true when objective is met", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      addWonCards(seat, [{ suit: "mountains", value: 1 }]);
      expect(Gandalf.objective.isCompleted(game, seat)).toBe(true);
    });
  });

  describe("display.renderStatus", () => {
    test("shows met=false when no tricks won", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      const status = Gandalf.display.renderStatus(game, seat);
      expect(status.met).toBe(false);
      expect(status.completable).toBe(true);
      expect(status.completed).toBe(false);
    });

    test("shows met=true and completed=true when trick won", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      addWonCards(seat, [{ suit: "mountains", value: 1 }]);
      const status = Gandalf.display.renderStatus(game, seat);
      expect(status.met).toBe(true);
      expect(status.completable).toBe(true);
      expect(status.completed).toBe(true);
    });
  });

  describe("metadata", () => {
    test("has correct name", () => {
      expect(Gandalf.name).toBe("Gandalf");
    });

    test("has correct setupText", () => {
      expect(Gandalf.setupText).toBe(
        "Take the lost card, then exchange with Frodo"
      );
    });

    test("has correct objective text", () => {
      expect(Gandalf.objective.text).toBe("Win at least one trick");
    });
  });
});
