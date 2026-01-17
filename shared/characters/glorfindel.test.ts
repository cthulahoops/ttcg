import { describe, expect, test } from "bun:test";
import { Glorfindel } from "./glorfindel";
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

describe("Glorfindel", () => {
  describe("objective.check", () => {
    test("returns false when no shadows cards won", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      expect(Glorfindel.objective.check(game, seat)).toBe(false);
    });

    test("returns false when only some shadows cards won", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      addWonCards(seat, [
        { suit: "shadows", value: 1 },
        { suit: "shadows", value: 2 },
        { suit: "shadows", value: 3 },
      ]);
      expect(Glorfindel.objective.check(game, seat)).toBe(false);
    });

    test("returns false when 7 shadows cards won", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      addWonCards(seat, [
        { suit: "shadows", value: 1 },
        { suit: "shadows", value: 2 },
        { suit: "shadows", value: 3 },
        { suit: "shadows", value: 4 },
        { suit: "shadows", value: 5 },
        { suit: "shadows", value: 6 },
        { suit: "shadows", value: 7 },
      ]);
      expect(Glorfindel.objective.check(game, seat)).toBe(false);
    });

    test("returns true when all 8 shadows cards won", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      addWonCards(seat, [
        { suit: "shadows", value: 1 },
        { suit: "shadows", value: 2 },
        { suit: "shadows", value: 3 },
        { suit: "shadows", value: 4 },
        { suit: "shadows", value: 5 },
        { suit: "shadows", value: 6 },
        { suit: "shadows", value: 7 },
        { suit: "shadows", value: 8 },
      ]);
      expect(Glorfindel.objective.check(game, seat)).toBe(true);
    });

    test("ignores non-shadows cards when counting", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      addWonCards(seat, [
        { suit: "mountains", value: 1 },
        { suit: "forests", value: 2 },
        { suit: "hills", value: 3 },
        { suit: "rings", value: 4 },
        { suit: "shadows", value: 1 },
      ]);
      expect(Glorfindel.objective.check(game, seat)).toBe(false);
    });

    test("counts shadows cards across multiple tricks", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      // Add shadows cards in separate tricks
      addWonCards(seat, [
        { suit: "shadows", value: 1 },
        { suit: "shadows", value: 2 },
      ]);
      addWonCards(seat, [
        { suit: "shadows", value: 3 },
        { suit: "shadows", value: 4 },
      ]);
      addWonCards(seat, [
        { suit: "shadows", value: 5 },
        { suit: "shadows", value: 6 },
      ]);
      addWonCards(seat, [
        { suit: "shadows", value: 7 },
        { suit: "shadows", value: 8 },
      ]);
      expect(Glorfindel.objective.check(game, seat)).toBe(true);
    });
  });

  describe("objective.isCompletable", () => {
    test("returns true when no shadows cards have been won by anyone", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      expect(Glorfindel.objective.isCompletable(game, seat)).toBe(true);
    });

    test("returns true when Glorfindel has won some shadows cards", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      addWonCards(seat, [
        { suit: "shadows", value: 1 },
        { suit: "shadows", value: 2 },
      ]);
      expect(Glorfindel.objective.isCompletable(game, seat)).toBe(true);
    });

    test("returns false when another player has won any shadows card", () => {
      const game = createTestGame(4);
      const glorfindelSeat = game.seats[0]!;
      const otherSeat = game.seats[1]!;
      addWonCards(otherSeat, [{ suit: "shadows", value: 1 }]);
      expect(Glorfindel.objective.isCompletable(game, glorfindelSeat)).toBe(
        false
      );
    });

    test("returns false when another player wins the 8 of shadows", () => {
      const game = createTestGame(4);
      const glorfindelSeat = game.seats[0]!;
      const otherSeat = game.seats[1]!;
      addWonCards(otherSeat, [{ suit: "shadows", value: 8 }]);
      expect(Glorfindel.objective.isCompletable(game, glorfindelSeat)).toBe(
        false
      );
    });

    test("returns true when Glorfindel has won all shadows cards", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      addWonCards(seat, [
        { suit: "shadows", value: 1 },
        { suit: "shadows", value: 2 },
        { suit: "shadows", value: 3 },
        { suit: "shadows", value: 4 },
        { suit: "shadows", value: 5 },
        { suit: "shadows", value: 6 },
        { suit: "shadows", value: 7 },
        { suit: "shadows", value: 8 },
      ]);
      expect(Glorfindel.objective.isCompletable(game, seat)).toBe(true);
    });

    test("ignores non-shadows cards won by others", () => {
      const game = createTestGame(4);
      const glorfindelSeat = game.seats[0]!;
      const otherSeat = game.seats[1]!;
      addWonCards(otherSeat, [
        { suit: "mountains", value: 1 },
        { suit: "forests", value: 2 },
        { suit: "hills", value: 3 },
        { suit: "rings", value: 4 },
      ]);
      expect(Glorfindel.objective.isCompletable(game, glorfindelSeat)).toBe(
        true
      );
    });
  });

  describe("objective.isCompleted", () => {
    test("returns same result as check", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      addWonCards(seat, [
        { suit: "shadows", value: 1 },
        { suit: "shadows", value: 2 },
        { suit: "shadows", value: 3 },
        { suit: "shadows", value: 4 },
        { suit: "shadows", value: 5 },
        { suit: "shadows", value: 6 },
        { suit: "shadows", value: 7 },
        { suit: "shadows", value: 8 },
      ]);
      expect(Glorfindel.objective.isCompleted(game, seat)).toBe(
        Glorfindel.objective.check(game, seat)
      );
    });

    test("returns false when not all shadows won", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      addWonCards(seat, [{ suit: "shadows", value: 1 }]);
      expect(Glorfindel.objective.isCompleted(game, seat)).toBe(false);
    });
  });

  describe("display.renderStatus", () => {
    test("shows 'Shadows: 0/8' when no shadows won", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      const status = Glorfindel.display.renderStatus(game, seat);
      expect(status.details).toBe("Shadows: 0/8");
      expect(status.met).toBe(false);
      expect(status.completable).toBe(true);
    });

    test("shows correct count when some shadows won", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      addWonCards(seat, [
        { suit: "shadows", value: 1 },
        { suit: "shadows", value: 3 },
        { suit: "shadows", value: 5 },
      ]);
      const status = Glorfindel.display.renderStatus(game, seat);
      expect(status.details).toBe("Shadows: 3/8");
      expect(status.met).toBe(false);
    });

    test("shows met=true and completed=true when all shadows won", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      addWonCards(seat, [
        { suit: "shadows", value: 1 },
        { suit: "shadows", value: 2 },
        { suit: "shadows", value: 3 },
        { suit: "shadows", value: 4 },
        { suit: "shadows", value: 5 },
        { suit: "shadows", value: 6 },
        { suit: "shadows", value: 7 },
        { suit: "shadows", value: 8 },
      ]);
      const status = Glorfindel.display.renderStatus(game, seat);
      expect(status.details).toBe("Shadows: 8/8");
      expect(status.met).toBe(true);
      expect(status.completed).toBe(true);
    });

    test("shows completable=false when other player won a shadows card", () => {
      const game = createTestGame(4);
      const glorfindelSeat = game.seats[0]!;
      const otherSeat = game.seats[1]!;
      addWonCards(otherSeat, [{ suit: "shadows", value: 4 }]);
      const status = Glorfindel.display.renderStatus(game, glorfindelSeat);
      expect(status.completable).toBe(false);
    });
  });

  describe("metadata", () => {
    test("has correct name", () => {
      expect(Glorfindel.name).toBe("Glorfindel");
    });

    test("has correct setupText", () => {
      expect(Glorfindel.setupText).toBe("Take the lost card");
    });

    test("has correct objective text", () => {
      expect(Glorfindel.objective.text).toBe("Win every Shadows card");
    });
  });
});
