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
  describe("objective.getStatus", () => {
    test("returns { tentative, failure } when no cards won", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      expect(Celeborn.objective.getStatus(game, seat)).toEqual({
        finality: "tentative",
        outcome: "failure",
      });
    });

    test("returns { tentative, failure } when no rank has 3 cards", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      addWonCards(seat, [
        { suit: "mountains", value: 1 },
        { suit: "shadows", value: 1 },
        { suit: "forests", value: 2 },
        { suit: "hills", value: 2 },
      ]);
      expect(Celeborn.objective.getStatus(game, seat)).toEqual({
        finality: "tentative",
        outcome: "failure",
      });
    });

    test("returns { final, success } when exactly 3 cards of same rank", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      addWonCards(seat, [
        { suit: "mountains", value: 5 },
        { suit: "shadows", value: 5 },
        { suit: "forests", value: 5 },
      ]);
      expect(Celeborn.objective.getStatus(game, seat)).toEqual({
        finality: "final",
        outcome: "success",
      });
    });

    test("returns { final, success } when 4 cards of same rank", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      addWonCards(seat, [
        { suit: "mountains", value: 3 },
        { suit: "shadows", value: 3 },
        { suit: "forests", value: 3 },
        { suit: "hills", value: 3 },
      ]);
      expect(Celeborn.objective.getStatus(game, seat)).toEqual({
        finality: "final",
        outcome: "success",
      });
    });

    test("returns { final, success } when one rank has 3+ even if others have fewer", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      addWonCards(seat, [
        { suit: "mountains", value: 2 },
        { suit: "shadows", value: 2 },
        { suit: "forests", value: 2 },
        { suit: "hills", value: 7 },
        { suit: "mountains", value: 8 },
      ]);
      expect(Celeborn.objective.getStatus(game, seat)).toEqual({
        finality: "final",
        outcome: "success",
      });
    });

    test("counts cards across multiple tricks", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      // Add cards in separate tricks
      addWonCards(seat, [{ suit: "mountains", value: 4 }]);
      addWonCards(seat, [{ suit: "shadows", value: 4 }]);
      addWonCards(seat, [{ suit: "forests", value: 4 }]);
      expect(Celeborn.objective.getStatus(game, seat)).toEqual({
        finality: "final",
        outcome: "success",
      });
    });
  });

  describe("objective.getDetails", () => {
    test("returns undefined when no cards won", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      expect(Celeborn.objective.getDetails!(game, seat)).toBeUndefined();
    });

    test("returns undefined when no rank has 2+ cards", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      addWonCards(seat, [
        { suit: "mountains", value: 1 },
        { suit: "shadows", value: 2 },
        { suit: "forests", value: 3 },
      ]);
      expect(Celeborn.objective.getDetails!(game, seat)).toBeUndefined();
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
      const details = Celeborn.objective.getDetails!(game, seat);
      expect(details).toContain("3:2");
      expect(details).toContain("5:2");
    });

    test("shows details with 3+ count when objective met", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      addWonCards(seat, [
        { suit: "mountains", value: 4 },
        { suit: "shadows", value: 4 },
        { suit: "forests", value: 4 },
      ]);
      expect(Celeborn.objective.getDetails!(game, seat)).toBe("4:3");
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
