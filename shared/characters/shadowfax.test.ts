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
  describe("objective.getStatus", () => {
    test("returns { tentative, failure } when no tricks have been won (game not finished)", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      // Add cards to hands so game is not finished
      for (const s of game.seats) {
        s.hand.addCard({ suit: "mountains", value: s.seatIndex + 1 });
      }
      expect(Shadowfax.objective.getStatus(game, seat)).toEqual({
        finality: "tentative",
        outcome: "failure",
      });
    });

    test("returns { tentative, failure } when won tricks have no hills cards", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      // Add cards to hands so game is not finished
      for (const s of game.seats) {
        s.hand.addCard({ suit: "mountains", value: s.seatIndex + 1 });
      }
      addWonCards(seat, [
        { suit: "forests", value: 3 },
        { suit: "mountains", value: 5 },
      ]);
      addWonCards(seat, [
        { suit: "shadows", value: 2 },
        { suit: "rings", value: 1 },
      ]);
      expect(Shadowfax.objective.getStatus(game, seat)).toEqual({
        finality: "tentative",
        outcome: "failure",
      });
    });

    test("returns { tentative, failure } when only 1 trick contains a hills card", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      // Add cards to hands so game is not finished
      for (const s of game.seats) {
        s.hand.addCard({ suit: "forests", value: s.seatIndex + 1 });
      }
      addWonCards(seat, [
        { suit: "hills", value: 4 },
        { suit: "forests", value: 2 },
      ]);
      addWonCards(seat, [
        { suit: "shadows", value: 3 },
        { suit: "mountains", value: 6 },
      ]);
      expect(Shadowfax.objective.getStatus(game, seat)).toEqual({
        finality: "tentative",
        outcome: "failure",
      });
    });

    test("returns { final, success } when exactly 2 tricks contain hills cards", () => {
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
      expect(Shadowfax.objective.getStatus(game, seat)).toEqual({
        finality: "final",
        outcome: "success",
      });
    });

    test("returns { final, success } when more than 2 tricks contain hills cards", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      addWonCards(seat, [{ suit: "hills", value: 1 }]);
      addWonCards(seat, [{ suit: "hills", value: 2 }]);
      addWonCards(seat, [{ suit: "hills", value: 3 }]);
      expect(Shadowfax.objective.getStatus(game, seat)).toEqual({
        finality: "final",
        outcome: "success",
      });
    });

    test("counts multiple hills in one trick as one trick with hills", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      // Add cards to hands so game is not finished
      for (const s of game.seats) {
        s.hand.addCard({ suit: "forests", value: s.seatIndex + 1 });
      }
      // One trick with 3 hills cards - only counts as 1 trick
      addWonCards(seat, [
        { suit: "hills", value: 1 },
        { suit: "hills", value: 2 },
        { suit: "hills", value: 3 },
      ]);
      expect(Shadowfax.objective.getStatus(game, seat)).toEqual({
        finality: "tentative",
        outcome: "failure",
      });
    });

    test("returns { final, failure } when game finished but objective not met", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      addWonCards(seat, [{ suit: "hills", value: 1 }]);
      expect(game.finished).toBe(true);
      expect(Shadowfax.objective.getStatus(game, seat)).toEqual({
        finality: "final",
        outcome: "failure",
      });
    });
  });

  describe("objective.getDetails", () => {
    test("shows 0/2 when no hills tricks won", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      const details = Shadowfax.objective.getDetails!(game, seat);
      expect(details).toBe("Tricks with hills: 0/2");
    });

    test("shows 1/2 when 1 hills trick won", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      addWonCards(seat, [{ suit: "hills", value: 5 }]);
      const details = Shadowfax.objective.getDetails!(game, seat);
      expect(details).toBe("Tricks with hills: 1/2");
    });

    test("shows 2/2 when objective achieved", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      addWonCards(seat, [{ suit: "hills", value: 5 }]);
      addWonCards(seat, [{ suit: "hills", value: 6 }]);
      const details = Shadowfax.objective.getDetails!(game, seat);
      expect(details).toBe("Tricks with hills: 2/2");
    });
  });

  describe("display.getObjectiveCards", () => {
    test("returns empty array when no tricks won", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      const result = Shadowfax.display.getObjectiveCards!(game, seat);
      expect(result.cards).toEqual([]);
    });

    test("returns empty array when won tricks have no hills cards", () => {
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
      const result = Shadowfax.display.getObjectiveCards!(game, seat);
      expect(result.cards).toEqual([]);
    });

    test("returns 1 trick marker when 1 trick contains hills", () => {
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
      const result = Shadowfax.display.getObjectiveCards!(game, seat);
      expect(result.cards).toEqual(["trick"]);
    });

    test("returns 2 trick markers when 2 tricks contain hills", () => {
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
      const result = Shadowfax.display.getObjectiveCards!(game, seat);
      expect(result.cards).toEqual(["trick", "trick"]);
    });

    test("returns trick markers for each qualifying trick, not individual hills cards", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      // One trick with 3 hills cards - should show as 1 trick marker
      addWonCards(seat, [
        { suit: "hills", value: 1 },
        { suit: "hills", value: 2 },
        { suit: "hills", value: 3 },
      ]);
      const result = Shadowfax.display.getObjectiveCards!(game, seat);
      expect(result.cards).toEqual(["trick"]);
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
