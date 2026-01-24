import { describe, expect, test } from "bun:test";
import { Elrond } from "./elrond";
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

describe("Elrond", () => {
  describe("objective.getStatus", () => {
    test("returns { tentative, failure } when no one has won rings", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      expect(Elrond.objective.getStatus(game, seat)).toEqual({
        finality: "tentative",
        outcome: "failure",
      });
    });

    test("returns { tentative, failure } when only some seats have won rings", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      // Only 2 of 4 seats have rings
      addWonCards(game.seats[0]!, [{ suit: "rings", value: 1 }]);
      addWonCards(game.seats[1]!, [{ suit: "rings", value: 2 }]);
      expect(Elrond.objective.getStatus(game, seat)).toEqual({
        finality: "tentative",
        outcome: "failure",
      });
    });

    test("returns { tentative, failure } when all but one seat has won rings", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      // 3 of 4 seats have rings
      addWonCards(game.seats[0]!, [{ suit: "rings", value: 1 }]);
      addWonCards(game.seats[1]!, [{ suit: "rings", value: 2 }]);
      addWonCards(game.seats[2]!, [{ suit: "rings", value: 3 }]);
      expect(Elrond.objective.getStatus(game, seat)).toEqual({
        finality: "tentative",
        outcome: "failure",
      });
    });

    test("returns { final, success } when all seats have won at least one ring", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      addWonCards(game.seats[0]!, [{ suit: "rings", value: 1 }]);
      addWonCards(game.seats[1]!, [{ suit: "rings", value: 2 }]);
      addWonCards(game.seats[2]!, [{ suit: "rings", value: 3 }]);
      addWonCards(game.seats[3]!, [{ suit: "rings", value: 4 }]);
      expect(Elrond.objective.getStatus(game, seat)).toEqual({
        finality: "final",
        outcome: "success",
      });
    });

    test("returns { final, success } in 3-player game when all seats have rings", () => {
      const game = createTestGame(3);
      const seat = game.seats[0]!;
      addWonCards(game.seats[0]!, [{ suit: "rings", value: 1 }]);
      addWonCards(game.seats[1]!, [{ suit: "rings", value: 2 }]);
      addWonCards(game.seats[2]!, [{ suit: "rings", value: 3 }]);
      expect(Elrond.objective.getStatus(game, seat)).toEqual({
        finality: "final",
        outcome: "success",
      });
    });

    test("returns { final, failure } when not enough rings remain for all seats needing them", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      // Only seat 0 has rings (with 4 of the 5 total), seats 1-3 need rings
      // Only 1 ring remains but 3 seats need them
      addWonCards(game.seats[0]!, [
        { suit: "rings", value: 1 },
        { suit: "rings", value: 2 },
        { suit: "rings", value: 3 },
        { suit: "rings", value: 4 },
      ]);
      expect(Elrond.objective.getStatus(game, seat)).toEqual({
        finality: "final",
        outcome: "failure",
      });
    });

    test("returns { final, failure } when one player hoards all rings", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      // One player has all 5 rings
      addWonCards(game.seats[0]!, [
        { suit: "rings", value: 1 },
        { suit: "rings", value: 2 },
        { suit: "rings", value: 3 },
        { suit: "rings", value: 4 },
        { suit: "rings", value: 5 },
      ]);
      expect(Elrond.objective.getStatus(game, seat)).toEqual({
        finality: "final",
        outcome: "failure",
      });
    });
  });

  describe("objective.getDetails", () => {
    test("shows correct count when no seats have rings", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      expect(Elrond.objective.getDetails!(game, seat)).toBe(
        "Seats with rings: 0/4"
      );
    });

    test("shows correct count when some seats have rings", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      addWonCards(game.seats[0]!, [{ suit: "rings", value: 1 }]);
      addWonCards(game.seats[2]!, [{ suit: "rings", value: 3 }]);
      expect(Elrond.objective.getDetails!(game, seat)).toBe(
        "Seats with rings: 2/4"
      );
    });

    test("shows correct count when all seats have rings", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      addWonCards(game.seats[0]!, [{ suit: "rings", value: 1 }]);
      addWonCards(game.seats[1]!, [{ suit: "rings", value: 2 }]);
      addWonCards(game.seats[2]!, [{ suit: "rings", value: 3 }]);
      addWonCards(game.seats[3]!, [{ suit: "rings", value: 4 }]);
      expect(Elrond.objective.getDetails!(game, seat)).toBe(
        "Seats with rings: 4/4"
      );
    });

    test("shows correct count for 3-player game", () => {
      const game = createTestGame(3);
      const seat = game.seats[0]!;
      addWonCards(game.seats[0]!, [{ suit: "rings", value: 1 }]);
      expect(Elrond.objective.getDetails!(game, seat)).toBe(
        "Seats with rings: 1/3"
      );
    });
  });

  describe("metadata", () => {
    test("has correct name", () => {
      expect(Elrond.name).toBe("Elrond");
    });

    test("has correct setupText", () => {
      expect(Elrond.setupText).toBe(
        "Everyone simultaneously passes 1 card to the right"
      );
    });

    test("has correct objective text", () => {
      expect(Elrond.objective.text).toBe(
        "Every character must win a ring card"
      );
    });
  });
});
