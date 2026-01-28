import { describe, expect, test } from "bun:test";
import { Merry } from "./merry";
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
  const game = new Game(numCharacters, numCharacters, seats, lostCard, 0);
  return game;
}

// Test helper: add won cards to a seat (simulates winning a trick)
function addWonCards(seat: Seat, cards: Card[]): void {
  seat.addTrick(seat.tricksWon.length, cards);
}

describe("Merry", () => {
  describe("objective.getStatus", () => {
    test("returns { tentative, failure } when no tricks won (game not finished)", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      // Add cards to hands so game is not finished
      for (const s of game.seats) {
        s.hand.addCard({ suit: "mountains", value: s.seatIndex + 1 });
      }
      expect(Merry.objective.getStatus(game, seat)).toEqual({
        finality: "tentative",
        outcome: "failure",
      });
    });

    test("returns { tentative, success } when exactly 1 trick won (game not finished)", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      // Add cards to hands so game is not finished
      for (const s of game.seats) {
        s.hand.addCard({ suit: "mountains", value: s.seatIndex + 1 });
      }
      addWonCards(seat, [{ suit: "mountains", value: 5 }]);
      expect(Merry.objective.getStatus(game, seat)).toEqual({
        finality: "tentative",
        outcome: "success",
      });
    });

    test("returns { tentative, success } when exactly 2 tricks won (game not finished)", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      // Add cards to hands so game is not finished
      for (const s of game.seats) {
        s.hand.addCard({ suit: "mountains", value: s.seatIndex + 1 });
      }
      addWonCards(seat, [{ suit: "mountains", value: 5 }]);
      addWonCards(seat, [{ suit: "shadows", value: 2 }]);
      expect(Merry.objective.getStatus(game, seat)).toEqual({
        finality: "tentative",
        outcome: "success",
      });
    });

    test("returns { final, failure } when 3 tricks won", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      addWonCards(seat, [{ suit: "mountains", value: 1 }]);
      addWonCards(seat, [{ suit: "shadows", value: 2 }]);
      addWonCards(seat, [{ suit: "forests", value: 3 }]);
      expect(Merry.objective.getStatus(game, seat)).toEqual({
        finality: "final",
        outcome: "failure",
      });
    });

    test("returns { final, failure } when more than 3 tricks won", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      addWonCards(seat, [{ suit: "mountains", value: 1 }]);
      addWonCards(seat, [{ suit: "shadows", value: 2 }]);
      addWonCards(seat, [{ suit: "forests", value: 3 }]);
      addWonCards(seat, [{ suit: "hills", value: 4 }]);
      expect(Merry.objective.getStatus(game, seat)).toEqual({
        finality: "final",
        outcome: "failure",
      });
    });

    test("returns { final, success } when game finished and objective met (1 trick)", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      addWonCards(seat, [{ suit: "mountains", value: 1 }]);
      game.currentTrickNumber = 9;
      // Game is finished since all hands are empty
      expect(game.finished).toBe(true);
      expect(Merry.objective.getStatus(game, seat)).toEqual({
        finality: "final",
        outcome: "success",
      });
    });

    test("returns { final, success } when game finished and objective met (2 tricks)", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      addWonCards(seat, [{ suit: "mountains", value: 1 }]);
      addWonCards(seat, [{ suit: "shadows", value: 2 }]);
      game.currentTrickNumber = 9;
      // Game is finished since all hands are empty
      expect(game.finished).toBe(true);
      expect(Merry.objective.getStatus(game, seat)).toEqual({
        finality: "final",
        outcome: "success",
      });
    });

    test("returns { final, failure } when game finished and no tricks won", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      game.currentTrickNumber = 9;
      // No tricks won by Merry, game is finished (empty hands)
      expect(game.finished).toBe(true);
      expect(Merry.objective.getStatus(game, seat)).toEqual({
        finality: "final",
        outcome: "failure",
      });
    });
  });

  describe("metadata", () => {
    test("has correct name", () => {
      expect(Merry.name).toBe("Merry");
    });

    test("has correct setupText", () => {
      expect(Merry.setupText).toBe("Exchange with Frodo, Pippin, or Sam");
    });
  });
});
