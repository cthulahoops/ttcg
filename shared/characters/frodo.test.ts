import { describe, expect, test } from "bun:test";
import { Frodo } from "./frodo";
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

describe("Frodo", () => {
  describe("objective.getText", () => {
    test("returns 'two' in 4-player game", () => {
      const game = createTestGame(4);
      const text = Frodo.objective.getText!(game);
      expect(text).toBe("Win at least two ring cards");
    });

    test("returns 'four' in 3-player game", () => {
      const game = createTestGame(3);
      const text = Frodo.objective.getText!(game);
      expect(text).toBe("Win at least four ring cards");
    });
  });

  describe("objective.getStatus", () => {
    test("returns { tentative, failure } when no rings won in 4-player game", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      expect(Frodo.objective.getStatus(game, seat)).toEqual({
        finality: "tentative",
        outcome: "failure",
      });
    });

    test("returns { tentative, failure } when only 1 ring won in 4-player game", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      addWonCards(seat, [{ suit: "rings", value: 1 }]);
      expect(Frodo.objective.getStatus(game, seat)).toEqual({
        finality: "tentative",
        outcome: "failure",
      });
    });

    test("returns { final, success } when 2 rings won in 4-player game", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      addWonCards(seat, [
        { suit: "rings", value: 1 },
        { suit: "rings", value: 2 },
      ]);
      expect(Frodo.objective.getStatus(game, seat)).toEqual({
        finality: "final",
        outcome: "success",
      });
    });

    test("returns { final, success } when more than 2 rings won in 4-player game", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      addWonCards(seat, [
        { suit: "rings", value: 1 },
        { suit: "rings", value: 2 },
        { suit: "rings", value: 3 },
      ]);
      expect(Frodo.objective.getStatus(game, seat)).toEqual({
        finality: "final",
        outcome: "success",
      });
    });

    test("returns { tentative, failure } when only 3 rings won in 3-player game", () => {
      const game = createTestGame(3);
      const seat = game.seats[0]!;
      addWonCards(seat, [
        { suit: "rings", value: 1 },
        { suit: "rings", value: 2 },
        { suit: "rings", value: 3 },
      ]);
      expect(Frodo.objective.getStatus(game, seat)).toEqual({
        finality: "tentative",
        outcome: "failure",
      });
    });

    test("returns { final, success } when 4 rings won in 3-player game", () => {
      const game = createTestGame(3);
      const seat = game.seats[0]!;
      addWonCards(seat, [
        { suit: "rings", value: 1 },
        { suit: "rings", value: 2 },
        { suit: "rings", value: 3 },
        { suit: "rings", value: 4 },
      ]);
      expect(Frodo.objective.getStatus(game, seat)).toEqual({
        finality: "final",
        outcome: "success",
      });
    });

    test("returns { final, failure } when others have won too many rings in 4-player game", () => {
      const game = createTestGame(4);
      const frodoSeat = game.seats[0]!;
      const otherSeat = game.seats[1]!;
      // Other player wins 4 rings, only 1 remains for Frodo
      addWonCards(otherSeat, [
        { suit: "rings", value: 1 },
        { suit: "rings", value: 2 },
        { suit: "rings", value: 3 },
        { suit: "rings", value: 4 },
      ]);
      expect(Frodo.objective.getStatus(game, frodoSeat)).toEqual({
        finality: "final",
        outcome: "failure",
      });
    });

    test("returns { tentative, failure } when Frodo can still reach 2 rings in 4-player game", () => {
      const game = createTestGame(4);
      const frodoSeat = game.seats[0]!;
      const otherSeat = game.seats[1]!;
      // Other player wins 3 rings, 2 remain for Frodo
      addWonCards(otherSeat, [
        { suit: "rings", value: 1 },
        { suit: "rings", value: 2 },
        { suit: "rings", value: 3 },
      ]);
      expect(Frodo.objective.getStatus(game, frodoSeat)).toEqual({
        finality: "tentative",
        outcome: "failure",
      });
    });
  });

  describe("objective.getDetails", () => {
    test("shows 'Rings: none' when no rings won", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      expect(Frodo.objective.getDetails!(game, seat)).toBe("Rings: none");
    });

    test("shows ring values sorted when rings won", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      addWonCards(seat, [
        { suit: "rings", value: 3 },
        { suit: "rings", value: 1 },
      ]);
      expect(Frodo.objective.getDetails!(game, seat)).toBe("Rings: 1, 3");
    });
  });

  describe("setup", () => {
    test("is a no-op function", async () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      // Should not throw and should complete
      await Frodo.setup(game, seat, { frodoSeat: seat });
      // Verify nothing changed
      expect(seat.tricksWon.length).toBe(0);
    });
  });

  describe("metadata", () => {
    test("has correct name", () => {
      expect(Frodo.name).toBe("Frodo");
    });

    test("has correct setupText", () => {
      expect(Frodo.setupText).toBe("No setup action");
    });
  });
});
