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
function addTrickWithNumber(
  seat: Seat,
  trickNumber: number,
  cards: Card[]
): void {
  seat.addTrick(trickNumber, cards);
}

describe("BarlimanButterbur", () => {
  describe("objective.getStatus", () => {
    test("returns { tentative, failure } when no tricks won (game not finished)", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      // Add cards to hands so game is not finished
      for (const s of game.seats) {
        s.hand.addCard({ suit: "forests", value: s.seatIndex + 1 });
      }
      expect(BarlimanButterbur.objective.getStatus(game, seat)).toEqual({
        finality: "tentative",
        outcome: "failure",
      });
    });

    test("returns { tentative, failure } when only won early tricks (before last 3)", () => {
      const game = createTestGame(4);
      // tricksToPlay defaults to 9 for 4 players, so last 3 are tricks 6, 7, 8 (0-indexed)
      // Tricks 0-5 are "early"
      const seat = game.seats[0]!;
      // Add cards to hands so game is not finished
      for (const s of game.seats) {
        s.hand.addCard({ suit: "forests", value: s.seatIndex + 1 });
      }
      addTrickWithNumber(seat, 0, [{ suit: "mountains", value: 1 }]);
      addTrickWithNumber(seat, 3, [{ suit: "mountains", value: 2 }]);
      addTrickWithNumber(seat, 5, [{ suit: "mountains", value: 3 }]);
      expect(BarlimanButterbur.objective.getStatus(game, seat)).toEqual({
        finality: "tentative",
        outcome: "failure",
      });
    });

    test("returns { final, success } when won the first of last 3 tricks", () => {
      const game = createTestGame(4);
      // tricksToPlay = 9, so trick 6 is the first of last 3 (9 - 3 = 6)
      const seat = game.seats[0]!;
      addTrickWithNumber(seat, 6, [{ suit: "mountains", value: 1 }]);
      expect(BarlimanButterbur.objective.getStatus(game, seat)).toEqual({
        finality: "final",
        outcome: "success",
      });
    });

    test("returns { final, success } when won the second of last 3 tricks", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      addTrickWithNumber(seat, 7, [{ suit: "mountains", value: 1 }]);
      expect(BarlimanButterbur.objective.getStatus(game, seat)).toEqual({
        finality: "final",
        outcome: "success",
      });
    });

    test("returns { final, success } when won the last trick", () => {
      const game = createTestGame(4);
      // tricksToPlay = 9, so trick 8 is the last trick (0-indexed)
      const seat = game.seats[0]!;
      addTrickWithNumber(seat, 8, [{ suit: "mountains", value: 1 }]);
      expect(BarlimanButterbur.objective.getStatus(game, seat)).toEqual({
        finality: "final",
        outcome: "success",
      });
    });

    test("returns { final, success } when won multiple of last 3 tricks", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      addTrickWithNumber(seat, 6, [{ suit: "mountains", value: 1 }]);
      addTrickWithNumber(seat, 8, [{ suit: "mountains", value: 2 }]);
      expect(BarlimanButterbur.objective.getStatus(game, seat)).toEqual({
        finality: "final",
        outcome: "success",
      });
    });

    test("returns { final, success } even when also won early tricks", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      addTrickWithNumber(seat, 0, [{ suit: "mountains", value: 1 }]);
      addTrickWithNumber(seat, 3, [{ suit: "mountains", value: 2 }]);
      addTrickWithNumber(seat, 7, [{ suit: "mountains", value: 3 }]);
      expect(BarlimanButterbur.objective.getStatus(game, seat)).toEqual({
        finality: "final",
        outcome: "success",
      });
    });

    test("works correctly with 3-player game (12 tricks)", () => {
      const game = createTestGame(3);
      // tricksToPlay = 12 for 3 players, so last 3 are tricks 9, 10, 11
      const seat = game.seats[0]!;
      // Add cards to hands so game is not finished
      for (const s of game.seats) {
        s.hand.addCard({ suit: "forests", value: s.seatIndex + 1 });
      }

      // Trick 8 is not in last 3
      addTrickWithNumber(seat, 8, [{ suit: "mountains", value: 1 }]);
      expect(BarlimanButterbur.objective.getStatus(game, seat)).toEqual({
        finality: "tentative",
        outcome: "failure",
      });

      // Trick 9 is in last 3 (12 - 3 = 9)
      addTrickWithNumber(seat, 9, [{ suit: "mountains", value: 2 }]);
      expect(BarlimanButterbur.objective.getStatus(game, seat)).toEqual({
        finality: "final",
        outcome: "success",
      });
    });

    test("returns { final, failure } when game finished but check fails", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      addTrickWithNumber(seat, 0, [{ suit: "mountains", value: 1 }]);
      expect(game.finished).toBe(true);
      expect(BarlimanButterbur.objective.getStatus(game, seat)).toEqual({
        finality: "final",
        outcome: "failure",
      });
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
      expect(BarlimanButterbur.objective.text).toBe(
        "Win at least one of the last three tricks"
      );
    });
  });
});
