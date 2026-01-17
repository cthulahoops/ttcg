import { describe, expect, test } from "bun:test";
import { Gwaihir } from "./gwaihir";
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
  const lostCard: Card = { suit: "shadows", value: 1 };
  return new Game(numCharacters, numCharacters, seats, lostCard, 0);
}

// Test helper: add won cards to a seat
function addWonCards(seat: Seat, cards: Card[]): void {
  seat.addTrick(seat.tricksWon.length, cards);
}

describe("Gwaihir", () => {
  describe("objective.check", () => {
    test("returns false when no tricks have been won", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      expect(Gwaihir.objective.check(game, seat)).toBe(false);
    });

    test("returns false when tricks won contain no mountains", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      addWonCards(seat, [
        { suit: "forests", value: 3 },
        { suit: "shadows", value: 5 },
      ]);
      addWonCards(seat, [
        { suit: "hills", value: 2 },
        { suit: "rings", value: 1 },
      ]);
      expect(Gwaihir.objective.check(game, seat)).toBe(false);
    });

    test("returns false when only 1 trick contains mountains", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      addWonCards(seat, [
        { suit: "mountains", value: 3 },
        { suit: "shadows", value: 5 },
      ]);
      addWonCards(seat, [
        { suit: "forests", value: 2 },
        { suit: "hills", value: 4 },
      ]);
      expect(Gwaihir.objective.check(game, seat)).toBe(false);
    });

    test("returns true when exactly 2 tricks contain mountains", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      addWonCards(seat, [
        { suit: "mountains", value: 3 },
        { suit: "shadows", value: 5 },
      ]);
      addWonCards(seat, [
        { suit: "mountains", value: 7 },
        { suit: "hills", value: 4 },
      ]);
      expect(Gwaihir.objective.check(game, seat)).toBe(true);
    });

    test("returns true when more than 2 tricks contain mountains", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      addWonCards(seat, [{ suit: "mountains", value: 1 }]);
      addWonCards(seat, [{ suit: "mountains", value: 2 }]);
      addWonCards(seat, [{ suit: "mountains", value: 3 }]);
      expect(Gwaihir.objective.check(game, seat)).toBe(true);
    });

    test("counts tricks with mountains, not mountain cards", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      // One trick with 3 mountain cards still only counts as 1 trick
      addWonCards(seat, [
        { suit: "mountains", value: 1 },
        { suit: "mountains", value: 2 },
        { suit: "mountains", value: 3 },
      ]);
      expect(Gwaihir.objective.check(game, seat)).toBe(false);
    });

    test("counts tricks with mountains correctly when mixed with other suits", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      // First trick: mountains + other cards
      addWonCards(seat, [
        { suit: "mountains", value: 5 },
        { suit: "forests", value: 3 },
        { suit: "shadows", value: 2 },
      ]);
      // Second trick: all mountains
      addWonCards(seat, [
        { suit: "mountains", value: 6 },
        { suit: "mountains", value: 7 },
      ]);
      expect(Gwaihir.objective.check(game, seat)).toBe(true);
    });
  });

  describe("objective.isCompletable", () => {
    test("returns true when no tricks have been won", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      expect(Gwaihir.objective.isCompletable(game, seat)).toBe(true);
    });

    test("returns true when objective is already met", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      addWonCards(seat, [{ suit: "mountains", value: 1 }]);
      addWonCards(seat, [{ suit: "mountains", value: 2 }]);
      expect(Gwaihir.objective.isCompletable(game, seat)).toBe(true);
    });

    test("returns true with only 1 mountain trick (still achievable)", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      addWonCards(seat, [{ suit: "mountains", value: 1 }]);
      expect(Gwaihir.objective.isCompletable(game, seat)).toBe(true);
    });
  });

  describe("objective.isCompleted", () => {
    test("delegates to check", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      addWonCards(seat, [{ suit: "mountains", value: 1 }]);
      addWonCards(seat, [{ suit: "mountains", value: 2 }]);
      expect(Gwaihir.objective.isCompleted(game, seat)).toBe(
        Gwaihir.objective.check(game, seat)
      );
    });

    test("returns false when check returns false", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      addWonCards(seat, [{ suit: "mountains", value: 1 }]);
      expect(Gwaihir.objective.isCompleted(game, seat)).toBe(false);
    });

    test("returns true when check returns true", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      addWonCards(seat, [{ suit: "mountains", value: 1 }]);
      addWonCards(seat, [{ suit: "mountains", value: 2 }]);
      expect(Gwaihir.objective.isCompleted(game, seat)).toBe(true);
    });
  });

  describe("display.renderStatus", () => {
    test("shows 0/2 when no mountain tricks won", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      const status = Gwaihir.display.renderStatus(game, seat);
      expect(status.details).toBe("Tricks with mountains: 0/2");
      expect(status.met).toBe(false);
      expect(status.completable).toBe(true);
    });

    test("shows 1/2 when 1 mountain trick won", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      addWonCards(seat, [{ suit: "mountains", value: 3 }]);
      const status = Gwaihir.display.renderStatus(game, seat);
      expect(status.details).toBe("Tricks with mountains: 1/2");
      expect(status.met).toBe(false);
    });

    test("shows 2/2 and met=true when objective achieved", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      addWonCards(seat, [{ suit: "mountains", value: 1 }]);
      addWonCards(seat, [{ suit: "mountains", value: 2 }]);
      const status = Gwaihir.display.renderStatus(game, seat);
      expect(status.details).toBe("Tricks with mountains: 2/2");
      expect(status.met).toBe(true);
      expect(status.completed).toBe(true);
    });

    test("shows count greater than 2 when exceeding target", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      addWonCards(seat, [{ suit: "mountains", value: 1 }]);
      addWonCards(seat, [{ suit: "mountains", value: 2 }]);
      addWonCards(seat, [{ suit: "mountains", value: 3 }]);
      const status = Gwaihir.display.renderStatus(game, seat);
      expect(status.details).toBe("Tricks with mountains: 3/2");
      expect(status.met).toBe(true);
    });
  });

  describe("metadata", () => {
    test("has correct name", () => {
      expect(Gwaihir.name).toBe("Gwaihir");
    });

    test("has correct setupText", () => {
      expect(Gwaihir.setupText).toBe("Exchange with Gandalf twice");
    });

    test("has correct objective text", () => {
      expect(Gwaihir.objective.text).toBe(
        "Win at least two tricks containing a mountain card"
      );
    });
  });
});
