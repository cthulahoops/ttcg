import { describe, expect, test } from "bun:test";
import { FattyBolger } from "./fatty-bolger";
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

// Test helper: add won cards to a seat (simulates winning a trick)
function addWonCards(seat: Seat, cards: Card[]): void {
  seat.addTrick(seat.tricksWon.length, cards);
}

describe("Fatty Bolger", () => {
  describe("objective.check", () => {
    test("returns false when no tricks won", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      expect(FattyBolger.objective.check(game, seat)).toBe(false);
    });

    test("returns true when exactly 1 trick won", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      addWonCards(seat, [{ suit: "mountains", value: 1 }]);
      expect(FattyBolger.objective.check(game, seat)).toBe(true);
    });

    test("returns false when 2 tricks won", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      addWonCards(seat, [{ suit: "mountains", value: 1 }]);
      addWonCards(seat, [{ suit: "shadows", value: 2 }]);
      expect(FattyBolger.objective.check(game, seat)).toBe(false);
    });

    test("returns false when more than 2 tricks won", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      addWonCards(seat, [{ suit: "mountains", value: 1 }]);
      addWonCards(seat, [{ suit: "shadows", value: 2 }]);
      addWonCards(seat, [{ suit: "forests", value: 3 }]);
      expect(FattyBolger.objective.check(game, seat)).toBe(false);
    });
  });

  describe("objective.isCompletable", () => {
    test("returns true when no tricks won", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      expect(FattyBolger.objective.isCompletable(game, seat)).toBe(true);
    });

    test("returns true when exactly 1 trick won", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      addWonCards(seat, [{ suit: "mountains", value: 1 }]);
      expect(FattyBolger.objective.isCompletable(game, seat)).toBe(true);
    });

    test("returns false when 2 or more tricks won", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      addWonCards(seat, [{ suit: "mountains", value: 1 }]);
      addWonCards(seat, [{ suit: "shadows", value: 2 }]);
      expect(FattyBolger.objective.isCompletable(game, seat)).toBe(false);
    });
  });

  describe("objective.isCompleted", () => {
    test("returns false when game is not finished even if objective met", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      // Add cards to hands so game is not finished
      for (const s of game.seats) {
        s.hand.addCard({ suit: "mountains", value: s.seatIndex + 1 });
      }
      addWonCards(seat, [{ suit: "shadows", value: 1 }]);
      // Game is not finished since players have cards
      expect(game.finished).toBe(false);
      expect(FattyBolger.objective.check(game, seat)).toBe(true);
      expect(FattyBolger.objective.isCompleted(game, seat)).toBe(false);
    });

    test("returns true when game finished and objective met", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      addWonCards(seat, [{ suit: "mountains", value: 1 }]);
      // Game is finished since all hands are empty
      expect(game.finished).toBe(true);
      expect(FattyBolger.objective.isCompleted(game, seat)).toBe(true);
    });

    test("returns false when game finished but objective not met (no tricks)", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      // No tricks won, game is finished (empty hands)
      expect(game.finished).toBe(true);
      expect(FattyBolger.objective.isCompleted(game, seat)).toBe(false);
    });

    test("returns false when game finished but objective not met (too many tricks)", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      addWonCards(seat, [{ suit: "mountains", value: 1 }]);
      addWonCards(seat, [{ suit: "shadows", value: 2 }]);
      // Game is finished since all hands are empty
      expect(game.finished).toBe(true);
      expect(FattyBolger.objective.isCompleted(game, seat)).toBe(false);
    });
  });

  describe("display.renderStatus", () => {
    test("shows met=false and completable=true when no tricks", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      const status = FattyBolger.display.renderStatus(game, seat);
      expect(status.met).toBe(false);
      expect(status.completable).toBe(true);
    });

    test("shows met=true when 1 trick won", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      addWonCards(seat, [{ suit: "mountains", value: 1 }]);
      const status = FattyBolger.display.renderStatus(game, seat);
      expect(status.met).toBe(true);
      expect(status.completable).toBe(true);
    });

    test("shows met=false and completable=false when 2 tricks won", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      addWonCards(seat, [{ suit: "mountains", value: 1 }]);
      addWonCards(seat, [{ suit: "shadows", value: 2 }]);
      const status = FattyBolger.display.renderStatus(game, seat);
      expect(status.met).toBe(false);
      expect(status.completable).toBe(false);
    });

    test("shows completed=true when game finished and objective met", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      addWonCards(seat, [{ suit: "mountains", value: 1 }]);
      // Game is finished since all hands are empty
      expect(game.finished).toBe(true);
      const status = FattyBolger.display.renderStatus(game, seat);
      expect(status.met).toBe(true);
      expect(status.completed).toBe(true);
    });

    test("shows completed=false when game finished but objective not met", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      // No tricks won, game is finished (empty hands)
      expect(game.finished).toBe(true);
      const status = FattyBolger.display.renderStatus(game, seat);
      expect(status.met).toBe(false);
      expect(status.completed).toBe(false);
    });
  });

  describe("metadata", () => {
    test("has correct name", () => {
      expect(FattyBolger.name).toBe("Fatty Bolger");
    });

    test("has correct setupText", () => {
      expect(FattyBolger.setupText).toBe(
        "Give a card to every other character (don't take any back)"
      );
    });

    test("has correct objective text", () => {
      expect(FattyBolger.objective.text).toBe("Win exactly one trick");
    });
  });
});
