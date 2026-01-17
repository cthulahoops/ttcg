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
  describe("objective.check", () => {
    test("returns false when no one has won rings", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      expect(Elrond.objective.check(game, seat)).toBe(false);
    });

    test("returns false when only some seats have won rings", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      // Only 2 of 4 seats have rings
      addWonCards(game.seats[0]!, [{ suit: "rings", value: 1 }]);
      addWonCards(game.seats[1]!, [{ suit: "rings", value: 2 }]);
      expect(Elrond.objective.check(game, seat)).toBe(false);
    });

    test("returns false when all but one seat has won rings", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      // 3 of 4 seats have rings
      addWonCards(game.seats[0]!, [{ suit: "rings", value: 1 }]);
      addWonCards(game.seats[1]!, [{ suit: "rings", value: 2 }]);
      addWonCards(game.seats[2]!, [{ suit: "rings", value: 3 }]);
      expect(Elrond.objective.check(game, seat)).toBe(false);
    });

    test("returns true when all seats have won at least one ring", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      addWonCards(game.seats[0]!, [{ suit: "rings", value: 1 }]);
      addWonCards(game.seats[1]!, [{ suit: "rings", value: 2 }]);
      addWonCards(game.seats[2]!, [{ suit: "rings", value: 3 }]);
      addWonCards(game.seats[3]!, [{ suit: "rings", value: 4 }]);
      expect(Elrond.objective.check(game, seat)).toBe(true);
    });

    test("returns true in 3-player game when all seats have rings", () => {
      const game = createTestGame(3);
      const seat = game.seats[0]!;
      addWonCards(game.seats[0]!, [{ suit: "rings", value: 1 }]);
      addWonCards(game.seats[1]!, [{ suit: "rings", value: 2 }]);
      addWonCards(game.seats[2]!, [{ suit: "rings", value: 3 }]);
      expect(Elrond.objective.check(game, seat)).toBe(true);
    });

    test("ignores non-ring cards", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      // Each seat has non-ring cards, but only 2 have ring cards
      addWonCards(game.seats[0]!, [
        { suit: "mountains", value: 1 },
        { suit: "rings", value: 1 },
      ]);
      addWonCards(game.seats[1]!, [
        { suit: "forests", value: 2 },
        { suit: "rings", value: 2 },
      ]);
      addWonCards(game.seats[2]!, [{ suit: "shadows", value: 3 }]);
      addWonCards(game.seats[3]!, [{ suit: "hills", value: 4 }]);
      expect(Elrond.objective.check(game, seat)).toBe(false);
    });

    test("returns true when seats have multiple rings each", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      addWonCards(game.seats[0]!, [
        { suit: "rings", value: 1 },
        { suit: "rings", value: 2 },
      ]);
      addWonCards(game.seats[1]!, [{ suit: "rings", value: 3 }]);
      addWonCards(game.seats[2]!, [{ suit: "rings", value: 4 }]);
      addWonCards(game.seats[3]!, [{ suit: "rings", value: 5 }]);
      expect(Elrond.objective.check(game, seat)).toBe(true);
    });
  });

  describe("objective.isCompletable", () => {
    test("returns true when no rings have been won yet (5 rings >= 4 seats)", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      expect(Elrond.objective.isCompletable(game, seat)).toBe(true);
    });

    test("returns true when enough rings remain for seats needing them", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      // 2 seats have rings, 2 seats still need them
      // 3 rings remain (5 - 2)
      addWonCards(game.seats[0]!, [{ suit: "rings", value: 1 }]);
      addWonCards(game.seats[1]!, [{ suit: "rings", value: 2 }]);
      expect(Elrond.objective.isCompletable(game, seat)).toBe(true);
    });

    test("returns false when not enough rings remain for all seats needing them", () => {
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
      expect(Elrond.objective.isCompletable(game, seat)).toBe(false);
    });

    test("returns true when rings remaining equals seats needing rings", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      // 1 seat has rings, 3 seats need them
      // 4 rings remain (5 - 1)
      addWonCards(game.seats[0]!, [{ suit: "rings", value: 1 }]);
      expect(Elrond.objective.isCompletable(game, seat)).toBe(true);
    });

    test("returns false when 3-player game with 2 rings gone to one player", () => {
      const game = createTestGame(3);
      const seat = game.seats[0]!;
      // Seat 0 has 3 rings, seats 1-2 need rings
      // Only 2 rings remain but they each need 1
      addWonCards(game.seats[0]!, [
        { suit: "rings", value: 1 },
        { suit: "rings", value: 2 },
        { suit: "rings", value: 3 },
      ]);
      expect(Elrond.objective.isCompletable(game, seat)).toBe(true);
    });

    test("returns false when one player hoards all rings", () => {
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
      expect(Elrond.objective.isCompletable(game, seat)).toBe(false);
    });
  });

  describe("objective.isCompleted", () => {
    test("delegates to check", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      addWonCards(game.seats[0]!, [{ suit: "rings", value: 1 }]);
      addWonCards(game.seats[1]!, [{ suit: "rings", value: 2 }]);
      addWonCards(game.seats[2]!, [{ suit: "rings", value: 3 }]);
      addWonCards(game.seats[3]!, [{ suit: "rings", value: 4 }]);
      expect(Elrond.objective.isCompleted(game, seat)).toBe(
        Elrond.objective.check(game, seat)
      );
    });

    test("returns false when check returns false", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      // Only 2 of 4 seats have rings
      addWonCards(game.seats[0]!, [{ suit: "rings", value: 1 }]);
      addWonCards(game.seats[1]!, [{ suit: "rings", value: 2 }]);
      expect(Elrond.objective.isCompleted(game, seat)).toBe(false);
    });
  });

  describe("display.renderStatus", () => {
    test("shows correct count when no seats have rings", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      const status = Elrond.display.renderStatus(game, seat);
      expect(status.details).toBe("Seats with rings: 0/4");
      expect(status.met).toBe(false);
      expect(status.completable).toBe(true);
    });

    test("shows correct count when some seats have rings", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      addWonCards(game.seats[0]!, [{ suit: "rings", value: 1 }]);
      addWonCards(game.seats[2]!, [{ suit: "rings", value: 3 }]);
      const status = Elrond.display.renderStatus(game, seat);
      expect(status.details).toBe("Seats with rings: 2/4");
      expect(status.met).toBe(false);
    });

    test("shows met=true when all seats have rings", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      addWonCards(game.seats[0]!, [{ suit: "rings", value: 1 }]);
      addWonCards(game.seats[1]!, [{ suit: "rings", value: 2 }]);
      addWonCards(game.seats[2]!, [{ suit: "rings", value: 3 }]);
      addWonCards(game.seats[3]!, [{ suit: "rings", value: 4 }]);
      const status = Elrond.display.renderStatus(game, seat);
      expect(status.details).toBe("Seats with rings: 4/4");
      expect(status.met).toBe(true);
      expect(status.completed).toBe(true);
    });

    test("shows completable=false when objective is impossible", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      // One player has 4 rings, 3 seats still need rings but only 1 remains
      addWonCards(game.seats[0]!, [
        { suit: "rings", value: 1 },
        { suit: "rings", value: 2 },
        { suit: "rings", value: 3 },
        { suit: "rings", value: 4 },
      ]);
      const status = Elrond.display.renderStatus(game, seat);
      expect(status.completable).toBe(false);
    });

    test("shows correct count for 3-player game", () => {
      const game = createTestGame(3);
      const seat = game.seats[0]!;
      addWonCards(game.seats[0]!, [{ suit: "rings", value: 1 }]);
      const status = Elrond.display.renderStatus(game, seat);
      expect(status.details).toBe("Seats with rings: 1/3");
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
