import { describe, expect, test } from "bun:test";
import { Boromir } from "./boromir";
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

describe("Boromir", () => {
  describe("objective.check", () => {
    test("returns false when no tricks have been played", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      expect(Boromir.objective.check(game, seat)).toBe(false);
    });

    test("returns false when Boromir did not win the last trick", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      game.lastTrickWinner = 1; // Someone else won
      expect(Boromir.objective.check(game, seat)).toBe(false);
    });

    test("returns false when Boromir won the last trick but has 1 of Rings", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      game.lastTrickWinner = 0;
      addWonCards(seat, [{ suit: "rings", value: 1 }]);
      expect(Boromir.objective.check(game, seat)).toBe(false);
    });

    test("returns true when Boromir won the last trick and does not have 1 of Rings", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      game.lastTrickWinner = 0;
      expect(Boromir.objective.check(game, seat)).toBe(true);
    });

    test("returns true when Boromir won the last trick with other rings cards", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      game.lastTrickWinner = 0;
      addWonCards(seat, [
        { suit: "rings", value: 2 },
        { suit: "rings", value: 3 },
        { suit: "rings", value: 5 },
      ]);
      expect(Boromir.objective.check(game, seat)).toBe(true);
    });

    test("works correctly for different seat indices", () => {
      const game = createTestGame(4);
      const seat = game.seats[2]!;
      game.lastTrickWinner = 2;
      expect(Boromir.objective.check(game, seat)).toBe(true);
    });
  });

  describe("objective.isCompletable", () => {
    test("returns true when Boromir does not have the 1 of Rings", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      expect(Boromir.objective.isCompletable(game, seat)).toBe(true);
    });

    test("returns true when Boromir has other rings cards but not the 1", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      addWonCards(seat, [
        { suit: "rings", value: 2 },
        { suit: "rings", value: 4 },
      ]);
      expect(Boromir.objective.isCompletable(game, seat)).toBe(true);
    });

    test("returns false when Boromir has the 1 of Rings", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      addWonCards(seat, [{ suit: "rings", value: 1 }]);
      expect(Boromir.objective.isCompletable(game, seat)).toBe(false);
    });

    test("returns false when 1 of Rings is among multiple won cards", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      addWonCards(seat, [
        { suit: "forests", value: 3 },
        { suit: "rings", value: 1 },
        { suit: "mountains", value: 7 },
      ]);
      expect(Boromir.objective.isCompletable(game, seat)).toBe(false);
    });
  });

  describe("objective.isCompleted", () => {
    test("returns false when game is not finished", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      game.lastTrickWinner = 0;
      // Add cards to multiple hands so game.finished returns false
      // Game is finished when (numCharacters - 1) players have no cards
      game.seats[0]!.hand.addCard({ suit: "forests", value: 1 });
      game.seats[1]!.hand.addCard({ suit: "forests", value: 2 });
      expect(Boromir.objective.isCompleted(game, seat)).toBe(false);
    });

    test("returns true when game is finished and objective is met", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      game.lastTrickWinner = 0;
      // Empty hands = game finished
      expect(Boromir.objective.isCompleted(game, seat)).toBe(true);
    });

    test("returns false when game is finished but Boromir has 1 of Rings", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      game.lastTrickWinner = 0;
      addWonCards(seat, [{ suit: "rings", value: 1 }]);
      expect(Boromir.objective.isCompleted(game, seat)).toBe(false);
    });

    test("returns false when game is finished but Boromir did not win last trick", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      game.lastTrickWinner = 1;
      expect(Boromir.objective.isCompleted(game, seat)).toBe(false);
    });
  });

  describe("display.renderStatus", () => {
    test("shows met=false when Boromir did not win last trick", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      game.lastTrickWinner = 1;
      const status = Boromir.display.renderStatus(game, seat);
      expect(status.met).toBe(false);
      expect(status.completable).toBe(true);
    });

    test("shows met=true when Boromir won last trick without 1 of Rings", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      game.lastTrickWinner = 0;
      const status = Boromir.display.renderStatus(game, seat);
      expect(status.met).toBe(true);
    });

    test("shows completable=false when Boromir has 1 of Rings", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      addWonCards(seat, [{ suit: "rings", value: 1 }]);
      const status = Boromir.display.renderStatus(game, seat);
      expect(status.completable).toBe(false);
    });

    test("shows correct details with last trick status", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      game.lastTrickWinner = 0;
      const status = Boromir.display.renderStatus(game, seat);
      expect(status.details).toContain("Last: ✓");
      expect(status.details).toContain("1-Ring: ✓");
    });

    test("shows correct details when has 1 of Rings", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      game.lastTrickWinner = 0;
      addWonCards(seat, [{ suit: "rings", value: 1 }]);
      const status = Boromir.display.renderStatus(game, seat);
      expect(status.details).toContain("Last: ✓");
      expect(status.details).toContain("1-Ring: ✗ (has 1-Ring)");
    });

    test("shows completed=true when game finished and objective met", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      game.lastTrickWinner = 0;
      const status = Boromir.display.renderStatus(game, seat);
      expect(status.completed).toBe(true);
    });
  });

  describe("metadata", () => {
    test("has correct name", () => {
      expect(Boromir.name).toBe("Boromir");
    });

    test("has correct setupText", () => {
      expect(Boromir.setupText).toBe("Exchange with anyone except Frodo");
    });

    test("has correct objective text", () => {
      expect(Boromir.objective.text).toBe(
        "Win the last trick; do NOT win the 1 of Rings"
      );
    });
  });
});
