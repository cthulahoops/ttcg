import { describe, expect, test } from "bun:test";
import { BarlimanButterbur } from "./barliman-butterbur";
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

// Test helper: add a trick with a specific trick number to a seat
function addTrickWithNumber(seat: Seat, trickNumber: number, cards: Card[]): void {
  seat.addTrick(trickNumber, cards);
}

describe("BarlimanButterbur", () => {
  describe("objective.check", () => {
    test("returns false when no tricks won", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      expect(BarlimanButterbur.objective.check(game, seat)).toBe(false);
    });

    test("returns false when only won early tricks (before last 3)", () => {
      const game = createTestGame(4);
      // tricksToPlay defaults to 9 for 4 players, so last 3 are tricks 6, 7, 8 (0-indexed)
      // Tricks 0-5 are "early"
      const seat = game.seats[0]!;
      addTrickWithNumber(seat, 0, [{ suit: "mountains", value: 1 }]);
      addTrickWithNumber(seat, 3, [{ suit: "mountains", value: 2 }]);
      addTrickWithNumber(seat, 5, [{ suit: "mountains", value: 3 }]);
      expect(BarlimanButterbur.objective.check(game, seat)).toBe(false);
    });

    test("returns true when won the first of last 3 tricks", () => {
      const game = createTestGame(4);
      // tricksToPlay = 9, so trick 6 is the first of last 3 (9 - 3 = 6)
      const seat = game.seats[0]!;
      addTrickWithNumber(seat, 6, [{ suit: "mountains", value: 1 }]);
      expect(BarlimanButterbur.objective.check(game, seat)).toBe(true);
    });

    test("returns true when won the second of last 3 tricks", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      addTrickWithNumber(seat, 7, [{ suit: "mountains", value: 1 }]);
      expect(BarlimanButterbur.objective.check(game, seat)).toBe(true);
    });

    test("returns true when won the last trick", () => {
      const game = createTestGame(4);
      // tricksToPlay = 9, so trick 8 is the last trick (0-indexed)
      const seat = game.seats[0]!;
      addTrickWithNumber(seat, 8, [{ suit: "mountains", value: 1 }]);
      expect(BarlimanButterbur.objective.check(game, seat)).toBe(true);
    });

    test("returns true when won multiple of last 3 tricks", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      addTrickWithNumber(seat, 6, [{ suit: "mountains", value: 1 }]);
      addTrickWithNumber(seat, 8, [{ suit: "mountains", value: 2 }]);
      expect(BarlimanButterbur.objective.check(game, seat)).toBe(true);
    });

    test("returns true even when also won early tricks", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      addTrickWithNumber(seat, 0, [{ suit: "mountains", value: 1 }]);
      addTrickWithNumber(seat, 3, [{ suit: "mountains", value: 2 }]);
      addTrickWithNumber(seat, 7, [{ suit: "mountains", value: 3 }]);
      expect(BarlimanButterbur.objective.check(game, seat)).toBe(true);
    });

    test("works correctly with 3-player game (12 tricks)", () => {
      const game = createTestGame(3);
      // tricksToPlay = 12 for 3 players, so last 3 are tricks 9, 10, 11
      const seat = game.seats[0]!;

      // Trick 8 is not in last 3
      addTrickWithNumber(seat, 8, [{ suit: "mountains", value: 1 }]);
      expect(BarlimanButterbur.objective.check(game, seat)).toBe(false);

      // Trick 9 is in last 3 (12 - 3 = 9)
      addTrickWithNumber(seat, 9, [{ suit: "mountains", value: 2 }]);
      expect(BarlimanButterbur.objective.check(game, seat)).toBe(true);
    });
  });

  describe("objective.isCompletable", () => {
    test("always returns true (last tricks are always possible)", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      expect(BarlimanButterbur.objective.isCompletable(game, seat)).toBe(true);
    });

    test("returns true even when player has won no tricks", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      expect(BarlimanButterbur.objective.isCompletable(game, seat)).toBe(true);
    });

    test("returns true even when player has won many early tricks", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      addTrickWithNumber(seat, 0, [{ suit: "mountains", value: 1 }]);
      addTrickWithNumber(seat, 1, [{ suit: "mountains", value: 2 }]);
      addTrickWithNumber(seat, 2, [{ suit: "mountains", value: 3 }]);
      expect(BarlimanButterbur.objective.isCompletable(game, seat)).toBe(true);
    });
  });

  describe("objective.isCompleted", () => {
    test("returns false when game not finished even if check passes", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      // Give cards to make game not finished
      seat.hand.addCard({ suit: "mountains", value: 1 });
      game.seats[1]!.hand.addCard({ suit: "mountains", value: 2 });
      addTrickWithNumber(seat, 7, [{ suit: "mountains", value: 3 }]);
      expect(BarlimanButterbur.objective.check(game, seat)).toBe(true);
      expect(game.finished).toBe(false);
      expect(BarlimanButterbur.objective.isCompleted(game, seat)).toBe(false);
    });

    test("returns true when game finished and check passes", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      addTrickWithNumber(seat, 7, [{ suit: "mountains", value: 1 }]);
      expect(game.finished).toBe(true);
      expect(BarlimanButterbur.objective.isCompleted(game, seat)).toBe(true);
    });

    test("returns false when game finished but check fails", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      addTrickWithNumber(seat, 0, [{ suit: "mountains", value: 1 }]);
      expect(game.finished).toBe(true);
      expect(BarlimanButterbur.objective.isCompleted(game, seat)).toBe(false);
    });
  });

  describe("display.renderStatus", () => {
    test("shows met=false when no tricks in last 3 won", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      const status = BarlimanButterbur.display.renderStatus(game, seat);
      expect(status.met).toBe(false);
    });

    test("shows met=true when won a trick in last 3", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      addTrickWithNumber(seat, 7, [{ suit: "mountains", value: 1 }]);
      const status = BarlimanButterbur.display.renderStatus(game, seat);
      expect(status.met).toBe(true);
    });

    test("shows completable=true always", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      const status = BarlimanButterbur.display.renderStatus(game, seat);
      expect(status.completable).toBe(true);
    });

    test("shows completed=true when game finished and objective met", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      addTrickWithNumber(seat, 8, [{ suit: "mountains", value: 1 }]);
      expect(game.finished).toBe(true);
      const status = BarlimanButterbur.display.renderStatus(game, seat);
      expect(status.completed).toBe(true);
    });

    test("shows completed=false when game not finished", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      seat.hand.addCard({ suit: "mountains", value: 1 });
      game.seats[1]!.hand.addCard({ suit: "mountains", value: 2 });
      addTrickWithNumber(seat, 8, [{ suit: "mountains", value: 3 }]);
      expect(game.finished).toBe(false);
      const status = BarlimanButterbur.display.renderStatus(game, seat);
      expect(status.completed).toBe(false);
    });
  });

  describe("metadata", () => {
    test("has correct name", () => {
      expect(BarlimanButterbur.name).toBe("Barliman Butterbur");
    });

    test("has correct setupText", () => {
      expect(BarlimanButterbur.setupText).toBe("Exchange with any player");
    });

    test("has correct objective text", () => {
      expect(BarlimanButterbur.objective.text).toBe("Win at least one of the last three tricks");
    });
  });
});
