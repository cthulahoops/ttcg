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

  describe("objective.check", () => {
    test("returns false when no rings won in 4-player game", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      expect(Frodo.objective.check(game, seat)).toBe(false);
    });

    test("returns false when only 1 ring won in 4-player game", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      addWonCards(seat, [{ suit: "rings", value: 1 }]);
      expect(Frodo.objective.check(game, seat)).toBe(false);
    });

    test("returns true when 2 rings won in 4-player game", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      addWonCards(seat, [
        { suit: "rings", value: 1 },
        { suit: "rings", value: 2 },
      ]);
      expect(Frodo.objective.check(game, seat)).toBe(true);
    });

    test("returns true when more than 2 rings won in 4-player game", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      addWonCards(seat, [
        { suit: "rings", value: 1 },
        { suit: "rings", value: 2 },
        { suit: "rings", value: 3 },
      ]);
      expect(Frodo.objective.check(game, seat)).toBe(true);
    });

    test("returns false when only 3 rings won in 3-player game", () => {
      const game = createTestGame(3);
      const seat = game.seats[0]!;
      addWonCards(seat, [
        { suit: "rings", value: 1 },
        { suit: "rings", value: 2 },
        { suit: "rings", value: 3 },
      ]);
      expect(Frodo.objective.check(game, seat)).toBe(false);
    });

    test("returns true when 4 rings won in 3-player game", () => {
      const game = createTestGame(3);
      const seat = game.seats[0]!;
      addWonCards(seat, [
        { suit: "rings", value: 1 },
        { suit: "rings", value: 2 },
        { suit: "rings", value: 3 },
        { suit: "rings", value: 4 },
      ]);
      expect(Frodo.objective.check(game, seat)).toBe(true);
    });

    test("ignores non-ring cards when counting", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      addWonCards(seat, [
        { suit: "mountains", value: 1 },
        { suit: "shadows", value: 2 },
        { suit: "forests", value: 3 },
        { suit: "hills", value: 4 },
        { suit: "rings", value: 1 },
      ]);
      expect(Frodo.objective.check(game, seat)).toBe(false);
    });
  });

  describe("objective.isCompletable", () => {
    test("returns true when no rings have been won by anyone", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      expect(Frodo.objective.isCompletable(game, seat)).toBe(true);
    });

    test("returns true when Frodo has won some rings", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      addWonCards(seat, [{ suit: "rings", value: 1 }]);
      expect(Frodo.objective.isCompletable(game, seat)).toBe(true);
    });

    test("returns false when others have won too many rings in 4-player game", () => {
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
      expect(Frodo.objective.isCompletable(game, frodoSeat)).toBe(false);
    });

    test("returns true when Frodo can still reach 2 rings in 4-player game", () => {
      const game = createTestGame(4);
      const frodoSeat = game.seats[0]!;
      const otherSeat = game.seats[1]!;
      // Other player wins 3 rings, 2 remain for Frodo
      addWonCards(otherSeat, [
        { suit: "rings", value: 1 },
        { suit: "rings", value: 2 },
        { suit: "rings", value: 3 },
      ]);
      expect(Frodo.objective.isCompletable(game, frodoSeat)).toBe(true);
    });

    test("returns false when others have won too many rings in 3-player game", () => {
      const game = createTestGame(3);
      const frodoSeat = game.seats[0]!;
      const otherSeat = game.seats[1]!;
      // Other player wins 2 rings, only 3 remain for Frodo (needs 4)
      addWonCards(otherSeat, [
        { suit: "rings", value: 1 },
        { suit: "rings", value: 2 },
      ]);
      expect(Frodo.objective.isCompletable(game, frodoSeat)).toBe(false);
    });

    test("accounts for rings won by Frodo when checking completability", () => {
      const game = createTestGame(4);
      const frodoSeat = game.seats[0]!;
      const otherSeat = game.seats[1]!;
      // Frodo has 1 ring, other has 3 rings, 1 remains
      addWonCards(frodoSeat, [{ suit: "rings", value: 1 }]);
      addWonCards(otherSeat, [
        { suit: "rings", value: 2 },
        { suit: "rings", value: 3 },
        { suit: "rings", value: 4 },
      ]);
      // Frodo has 1 + 1 remaining = 2, so it's completable
      expect(Frodo.objective.isCompletable(game, frodoSeat)).toBe(true);
    });
  });

  describe("objective.isCompleted", () => {
    test("returns same result as check", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      addWonCards(seat, [
        { suit: "rings", value: 1 },
        { suit: "rings", value: 2 },
      ]);
      expect(Frodo.objective.isCompleted(game, seat)).toBe(
        Frodo.objective.check(game, seat)
      );
    });
  });

  describe("display.renderStatus", () => {
    test("shows 'Rings: none' when no rings won", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      const status = Frodo.display.renderStatus(game, seat);
      expect(status.details).toBe("Rings: none");
      expect(status.met).toBe(false);
      expect(status.completable).toBe(true);
    });

    test("shows ring values sorted when rings won", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      addWonCards(seat, [
        { suit: "rings", value: 3 },
        { suit: "rings", value: 1 },
      ]);
      const status = Frodo.display.renderStatus(game, seat);
      expect(status.details).toBe("Rings: 1, 3");
    });

    test("shows met=true when objective is met", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      addWonCards(seat, [
        { suit: "rings", value: 1 },
        { suit: "rings", value: 2 },
      ]);
      const status = Frodo.display.renderStatus(game, seat);
      expect(status.met).toBe(true);
      expect(status.completed).toBe(true);
    });

    test("shows completable=false when objective is impossible", () => {
      const game = createTestGame(4);
      const frodoSeat = game.seats[0]!;
      const otherSeat = game.seats[1]!;
      addWonCards(otherSeat, [
        { suit: "rings", value: 1 },
        { suit: "rings", value: 2 },
        { suit: "rings", value: 3 },
        { suit: "rings", value: 4 },
      ]);
      const status = Frodo.display.renderStatus(game, frodoSeat);
      expect(status.completable).toBe(false);
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
