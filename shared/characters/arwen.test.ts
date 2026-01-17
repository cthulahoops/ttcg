import { describe, expect, test } from "bun:test";
import { Arwen } from "./arwen";
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

describe("Arwen", () => {
  describe("objective.check", () => {
    test("returns false when no forests won", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      expect(Arwen.objective.check(game, seat)).toBe(false);
    });

    test("returns true when has more forests than all others (sole leader)", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      addWonCards(seat, [
        { suit: "forests", value: 1 },
        { suit: "forests", value: 2 },
      ]);
      expect(Arwen.objective.check(game, seat)).toBe(true);
    });

    test("returns false when tied for most forests", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      const otherSeat = game.seats[1]!;
      addWonCards(seat, [{ suit: "forests", value: 1 }]);
      addWonCards(otherSeat, [{ suit: "forests", value: 2 }]);
      expect(Arwen.objective.check(game, seat)).toBe(false);
    });

    test("returns false when another player has more forests", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      const otherSeat = game.seats[1]!;
      addWonCards(seat, [{ suit: "forests", value: 1 }]);
      addWonCards(otherSeat, [
        { suit: "forests", value: 2 },
        { suit: "forests", value: 3 },
      ]);
      expect(Arwen.objective.check(game, seat)).toBe(false);
    });

    test("ignores non-forests cards when counting", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      addWonCards(seat, [
        { suit: "mountains", value: 1 },
        { suit: "shadows", value: 2 },
        { suit: "hills", value: 3 },
        { suit: "rings", value: 1 },
      ]);
      expect(Arwen.objective.check(game, seat)).toBe(false);
    });

    test("counts forests across multiple tricks", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      addWonCards(seat, [{ suit: "forests", value: 1 }]);
      addWonCards(seat, [{ suit: "forests", value: 2 }]);
      addWonCards(seat, [{ suit: "forests", value: 3 }]);
      expect(Arwen.objective.check(game, seat)).toBe(true);
    });
  });

  describe("objective.isCompletable", () => {
    test("returns true when no forests have been won", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      expect(Arwen.objective.isCompletable(game, seat)).toBe(true);
    });

    test("returns true when Arwen is currently winning", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      addWonCards(seat, [
        { suit: "forests", value: 1 },
        { suit: "forests", value: 2 },
      ]);
      expect(Arwen.objective.isCompletable(game, seat)).toBe(true);
    });

    test("returns true when Arwen can catch up with remaining forests", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      const otherSeat = game.seats[1]!;
      // Other has 2, Arwen has 0, 6 forests remain - Arwen can still win
      addWonCards(otherSeat, [
        { suit: "forests", value: 1 },
        { suit: "forests", value: 2 },
      ]);
      expect(Arwen.objective.isCompletable(game, seat)).toBe(true);
    });

    test("returns false when others have too many forests to overtake", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      const otherSeat = game.seats[1]!;
      // Other has 5 forests, only 3 remain for Arwen - can't exceed 5
      addWonCards(otherSeat, [
        { suit: "forests", value: 1 },
        { suit: "forests", value: 2 },
        { suit: "forests", value: 3 },
        { suit: "forests", value: 4 },
        { suit: "forests", value: 5 },
      ]);
      expect(Arwen.objective.isCompletable(game, seat)).toBe(false);
    });

    test("returns false when tied and no forests remain", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      const otherSeat = game.seats[1]!;
      // Both have 4 forests, no remaining forests to break tie
      addWonCards(seat, [
        { suit: "forests", value: 1 },
        { suit: "forests", value: 2 },
        { suit: "forests", value: 3 },
        { suit: "forests", value: 4 },
      ]);
      addWonCards(otherSeat, [
        { suit: "forests", value: 5 },
        { suit: "forests", value: 6 },
        { suit: "forests", value: 7 },
        { suit: "forests", value: 8 },
      ]);
      expect(Arwen.objective.isCompletable(game, seat)).toBe(false);
    });

    test("accounts for Arwen's current forests when calculating", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      const otherSeat = game.seats[1]!;
      // Arwen has 2, other has 3, 3 remain - Arwen can reach 5, exceeding 3
      addWonCards(seat, [
        { suit: "forests", value: 1 },
        { suit: "forests", value: 2 },
      ]);
      addWonCards(otherSeat, [
        { suit: "forests", value: 3 },
        { suit: "forests", value: 4 },
        { suit: "forests", value: 5 },
      ]);
      expect(Arwen.objective.isCompletable(game, seat)).toBe(true);
    });
  });

  describe("objective.isCompleted", () => {
    test("returns false when game not finished even if check passes", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      // Give cards to make game not finished
      seat.hand.addCard({ suit: "mountains", value: 1 });
      game.seats[1]!.hand.addCard({ suit: "mountains", value: 2 });
      addWonCards(seat, [
        { suit: "forests", value: 1 },
        { suit: "forests", value: 2 },
      ]);
      expect(Arwen.objective.check(game, seat)).toBe(true);
      expect(game.finished).toBe(false);
      expect(Arwen.objective.isCompleted(game, seat)).toBe(false);
    });

    test("returns true when game finished and check passes", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      addWonCards(seat, [
        { suit: "forests", value: 1 },
        { suit: "forests", value: 2 },
      ]);
      expect(game.finished).toBe(true);
      expect(Arwen.objective.isCompleted(game, seat)).toBe(true);
    });

    test("returns false when game finished but check fails", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      expect(game.finished).toBe(true);
      expect(Arwen.objective.isCompleted(game, seat)).toBe(false);
    });
  });

  describe("display.renderStatus", () => {
    test("shows 'Forests: 0' when no forests won", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      const status = Arwen.display.renderStatus(game, seat);
      expect(status.details).toBe("Forests: 0");
      expect(status.met).toBe(false);
      expect(status.completable).toBe(true);
    });

    test("shows forests count when forests won", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      addWonCards(seat, [
        { suit: "forests", value: 1 },
        { suit: "forests", value: 2 },
        { suit: "forests", value: 3 },
      ]);
      const status = Arwen.display.renderStatus(game, seat);
      expect(status.details).toBe("Forests: 3");
    });

    test("shows met=true when has most forests", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      addWonCards(seat, [
        { suit: "forests", value: 1 },
        { suit: "forests", value: 2 },
      ]);
      const status = Arwen.display.renderStatus(game, seat);
      expect(status.met).toBe(true);
    });

    test("shows met=false when tied for most", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      const otherSeat = game.seats[1]!;
      addWonCards(seat, [{ suit: "forests", value: 1 }]);
      addWonCards(otherSeat, [{ suit: "forests", value: 2 }]);
      const status = Arwen.display.renderStatus(game, seat);
      expect(status.met).toBe(false);
    });

    test("shows completable=false when cannot overtake leader", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      const otherSeat = game.seats[1]!;
      addWonCards(otherSeat, [
        { suit: "forests", value: 1 },
        { suit: "forests", value: 2 },
        { suit: "forests", value: 3 },
        { suit: "forests", value: 4 },
        { suit: "forests", value: 5 },
      ]);
      const status = Arwen.display.renderStatus(game, seat);
      expect(status.completable).toBe(false);
    });

    test("shows completed=true when game finished and objective met", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      addWonCards(seat, [
        { suit: "forests", value: 1 },
        { suit: "forests", value: 2 },
      ]);
      const status = Arwen.display.renderStatus(game, seat);
      expect(status.completed).toBe(true);
    });
  });

  describe("metadata", () => {
    test("has correct name", () => {
      expect(Arwen.name).toBe("Arwen");
    });

    test("has correct setupText", () => {
      expect(Arwen.setupText).toBe("Exchange with Elrond or Aragorn");
    });

    test("has correct objective text", () => {
      expect(Arwen.objective.text).toBe("Win the most forests cards");
    });
  });
});
