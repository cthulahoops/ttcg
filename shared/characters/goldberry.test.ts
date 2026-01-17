import { describe, expect, test } from "bun:test";
import { Goldberry } from "./goldberry";
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

// Test helper: add won trick to a seat with a specific trick number
function addTrickWithNumber(seat: Seat, trickNumber: number, cards: Card[]): void {
  seat.addTrick(trickNumber, cards);
}

describe("Goldberry", () => {
  describe("objective.check", () => {
    test("returns false when no tricks won", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      expect(Goldberry.objective.check(game, seat)).toBe(false);
    });

    test("returns false when only 1 trick won", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      addTrickWithNumber(seat, 0, [{ suit: "mountains", value: 1 }]);
      expect(Goldberry.objective.check(game, seat)).toBe(false);
    });

    test("returns false when only 2 tricks won", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      addTrickWithNumber(seat, 0, [{ suit: "mountains", value: 1 }]);
      addTrickWithNumber(seat, 1, [{ suit: "shadows", value: 2 }]);
      expect(Goldberry.objective.check(game, seat)).toBe(false);
    });

    test("returns true when exactly 3 consecutive tricks won (0, 1, 2)", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      addTrickWithNumber(seat, 0, [{ suit: "mountains", value: 1 }]);
      addTrickWithNumber(seat, 1, [{ suit: "shadows", value: 2 }]);
      addTrickWithNumber(seat, 2, [{ suit: "forests", value: 3 }]);
      expect(Goldberry.objective.check(game, seat)).toBe(true);
    });

    test("returns true when exactly 3 consecutive tricks won (3, 4, 5)", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      addTrickWithNumber(seat, 3, [{ suit: "mountains", value: 1 }]);
      addTrickWithNumber(seat, 4, [{ suit: "shadows", value: 2 }]);
      addTrickWithNumber(seat, 5, [{ suit: "forests", value: 3 }]);
      expect(Goldberry.objective.check(game, seat)).toBe(true);
    });

    test("returns false when 3 tricks won but not consecutive (0, 1, 3)", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      addTrickWithNumber(seat, 0, [{ suit: "mountains", value: 1 }]);
      addTrickWithNumber(seat, 1, [{ suit: "shadows", value: 2 }]);
      addTrickWithNumber(seat, 3, [{ suit: "forests", value: 3 }]);
      expect(Goldberry.objective.check(game, seat)).toBe(false);
    });

    test("returns false when 3 tricks won but not consecutive (0, 2, 4)", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      addTrickWithNumber(seat, 0, [{ suit: "mountains", value: 1 }]);
      addTrickWithNumber(seat, 2, [{ suit: "shadows", value: 2 }]);
      addTrickWithNumber(seat, 4, [{ suit: "forests", value: 3 }]);
      expect(Goldberry.objective.check(game, seat)).toBe(false);
    });

    test("returns false when more than 3 tricks won", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      addTrickWithNumber(seat, 0, [{ suit: "mountains", value: 1 }]);
      addTrickWithNumber(seat, 1, [{ suit: "shadows", value: 2 }]);
      addTrickWithNumber(seat, 2, [{ suit: "forests", value: 3 }]);
      addTrickWithNumber(seat, 3, [{ suit: "hills", value: 4 }]);
      expect(Goldberry.objective.check(game, seat)).toBe(false);
    });

    test("returns true when tricks added out of order but form sequence", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      // Add in non-sequential order to test sorting
      addTrickWithNumber(seat, 5, [{ suit: "forests", value: 3 }]);
      addTrickWithNumber(seat, 3, [{ suit: "mountains", value: 1 }]);
      addTrickWithNumber(seat, 4, [{ suit: "shadows", value: 2 }]);
      expect(Goldberry.objective.check(game, seat)).toBe(true);
    });
  });

  describe("objective.isCompletable", () => {
    test("returns true when no tricks won and enough tricks remaining", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      // Default game has 9 tricks total, currentTrickNumber starts at 0
      expect(Goldberry.objective.isCompletable(game, seat)).toBe(true);
    });

    test("returns false when more than 3 tricks won", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      addTrickWithNumber(seat, 0, [{ suit: "mountains", value: 1 }]);
      addTrickWithNumber(seat, 1, [{ suit: "shadows", value: 2 }]);
      addTrickWithNumber(seat, 2, [{ suit: "forests", value: 3 }]);
      addTrickWithNumber(seat, 3, [{ suit: "hills", value: 4 }]);
      expect(Goldberry.objective.isCompletable(game, seat)).toBe(false);
    });

    test("returns true when exactly 3 consecutive tricks won (objective met)", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      addTrickWithNumber(seat, 0, [{ suit: "mountains", value: 1 }]);
      addTrickWithNumber(seat, 1, [{ suit: "shadows", value: 2 }]);
      addTrickWithNumber(seat, 2, [{ suit: "forests", value: 3 }]);
      expect(Goldberry.objective.isCompletable(game, seat)).toBe(true);
    });

    test("returns false when 3 tricks won but not consecutive", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      addTrickWithNumber(seat, 0, [{ suit: "mountains", value: 1 }]);
      addTrickWithNumber(seat, 1, [{ suit: "shadows", value: 2 }]);
      addTrickWithNumber(seat, 3, [{ suit: "forests", value: 3 }]);
      expect(Goldberry.objective.isCompletable(game, seat)).toBe(false);
    });

    test("returns true when 1 trick won and can continue sequence", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      addTrickWithNumber(seat, 2, [{ suit: "mountains", value: 1 }]);
      game.currentTrickNumber = 3; // Next trick is 3, continues sequence
      expect(Goldberry.objective.isCompletable(game, seat)).toBe(true);
    });

    test("returns false when 1 trick won but missed next trick", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      addTrickWithNumber(seat, 2, [{ suit: "mountains", value: 1 }]);
      game.currentTrickNumber = 4; // Already past trick 3, sequence broken
      expect(Goldberry.objective.isCompletable(game, seat)).toBe(false);
    });

    test("returns true when 2 consecutive tricks won and can continue", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      addTrickWithNumber(seat, 3, [{ suit: "mountains", value: 1 }]);
      addTrickWithNumber(seat, 4, [{ suit: "shadows", value: 2 }]);
      game.currentTrickNumber = 5; // Next trick is 5, continues sequence
      expect(Goldberry.objective.isCompletable(game, seat)).toBe(true);
    });

    test("returns false when 2 consecutive tricks won but gap in sequence", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      addTrickWithNumber(seat, 3, [{ suit: "mountains", value: 1 }]);
      addTrickWithNumber(seat, 4, [{ suit: "shadows", value: 2 }]);
      game.currentTrickNumber = 6; // Missed trick 5, sequence broken
      expect(Goldberry.objective.isCompletable(game, seat)).toBe(false);
    });

    test("returns false when not enough tricks remaining (0 tricks won)", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      game.currentTrickNumber = 7; // Only 2 tricks remaining (7, 8)
      expect(Goldberry.objective.isCompletable(game, seat)).toBe(false);
    });

    test("returns false when 2 tricks won but not consecutive", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      addTrickWithNumber(seat, 1, [{ suit: "mountains", value: 1 }]);
      addTrickWithNumber(seat, 3, [{ suit: "shadows", value: 2 }]);
      expect(Goldberry.objective.isCompletable(game, seat)).toBe(false);
    });
  });

  describe("objective.isCompleted", () => {
    test("returns false when game not finished even if objective met", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      // Add cards to hands so game is not finished
      game.seats[0]!.hand.addCard({ suit: "mountains", value: 8 });
      game.seats[1]!.hand.addCard({ suit: "shadows", value: 8 });
      addTrickWithNumber(seat, 0, [{ suit: "mountains", value: 1 }]);
      addTrickWithNumber(seat, 1, [{ suit: "shadows", value: 2 }]);
      addTrickWithNumber(seat, 2, [{ suit: "forests", value: 3 }]);
      expect(Goldberry.objective.check(game, seat)).toBe(true);
      expect(game.finished).toBe(false);
      expect(Goldberry.objective.isCompleted(game, seat)).toBe(false);
    });

    test("returns true when game finished and objective met", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      addTrickWithNumber(seat, 0, [{ suit: "mountains", value: 1 }]);
      addTrickWithNumber(seat, 1, [{ suit: "shadows", value: 2 }]);
      addTrickWithNumber(seat, 2, [{ suit: "forests", value: 3 }]);
      // Game finished when all hands empty
      expect(game.finished).toBe(true);
      expect(Goldberry.objective.isCompleted(game, seat)).toBe(true);
    });

    test("returns false when game finished but objective not met", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      addTrickWithNumber(seat, 0, [{ suit: "mountains", value: 1 }]);
      addTrickWithNumber(seat, 1, [{ suit: "shadows", value: 2 }]);
      // Only 2 tricks - not enough
      expect(game.finished).toBe(true);
      expect(Goldberry.objective.isCompleted(game, seat)).toBe(false);
    });
  });

  describe("display.renderStatus", () => {
    test("shows met=false completable=true when no tricks won", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      const status = Goldberry.display.renderStatus(game, seat);
      expect(status.met).toBe(false);
      expect(status.completable).toBe(true);
    });

    test("shows met=true when exactly 3 consecutive tricks won", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      addTrickWithNumber(seat, 0, [{ suit: "mountains", value: 1 }]);
      addTrickWithNumber(seat, 1, [{ suit: "shadows", value: 2 }]);
      addTrickWithNumber(seat, 2, [{ suit: "forests", value: 3 }]);
      const status = Goldberry.display.renderStatus(game, seat);
      expect(status.met).toBe(true);
      expect(status.completed).toBe(true);
    });

    test("shows met=false completable=false when too many tricks won", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      addTrickWithNumber(seat, 0, [{ suit: "mountains", value: 1 }]);
      addTrickWithNumber(seat, 1, [{ suit: "shadows", value: 2 }]);
      addTrickWithNumber(seat, 2, [{ suit: "forests", value: 3 }]);
      addTrickWithNumber(seat, 3, [{ suit: "hills", value: 4 }]);
      const status = Goldberry.display.renderStatus(game, seat);
      expect(status.met).toBe(false);
      expect(status.completable).toBe(false);
    });

    test("shows completable=false when sequence broken", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      addTrickWithNumber(seat, 0, [{ suit: "mountains", value: 1 }]);
      addTrickWithNumber(seat, 2, [{ suit: "forests", value: 3 }]); // Gap at trick 1
      const status = Goldberry.display.renderStatus(game, seat);
      expect(status.met).toBe(false);
      expect(status.completable).toBe(false);
    });
  });

  describe("metadata", () => {
    test("has correct name", () => {
      expect(Goldberry.name).toBe("Goldberry");
    });

    test("has correct setupText", () => {
      expect(Goldberry.setupText).toBe(
        "Turn your hand face-up (visible to all players)"
      );
    });

    test("has correct objective text", () => {
      expect(Goldberry.objective.text).toBe(
        "Win exactly three tricks in a row and no other tricks"
      );
    });
  });
});
