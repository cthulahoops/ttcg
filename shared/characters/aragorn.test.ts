import { describe, expect, test } from "bun:test";
import { Aragorn } from "./aragorn";
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

describe("Aragorn", () => {
  describe("objective.check", () => {
    test("returns false when no threat card set", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      seat.threatCard = null;
      expect(Aragorn.objective.check(game, seat)).toBe(false);
    });

    test("returns false when trick count does not match threat card", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      seat.threatCard = 3;
      // No tricks won, threat card is 3
      expect(Aragorn.objective.check(game, seat)).toBe(false);
    });

    test("returns true when trick count equals threat card (1 trick, threat=1)", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      seat.threatCard = 1;
      addWonCards(seat, [{ suit: "mountains", value: 1 }]);
      expect(Aragorn.objective.check(game, seat)).toBe(true);
    });

    test("returns true when trick count equals threat card (3 tricks, threat=3)", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      seat.threatCard = 3;
      addWonCards(seat, [{ suit: "mountains", value: 1 }]);
      addWonCards(seat, [{ suit: "shadows", value: 2 }]);
      addWonCards(seat, [{ suit: "forests", value: 3 }]);
      expect(Aragorn.objective.check(game, seat)).toBe(true);
    });

    test("returns false when trick count exceeds threat card", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      seat.threatCard = 2;
      addWonCards(seat, [{ suit: "mountains", value: 1 }]);
      addWonCards(seat, [{ suit: "shadows", value: 2 }]);
      addWonCards(seat, [{ suit: "forests", value: 3 }]);
      expect(Aragorn.objective.check(game, seat)).toBe(false);
    });

    test("returns false when trick count is below threat card", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      seat.threatCard = 5;
      addWonCards(seat, [{ suit: "mountains", value: 1 }]);
      addWonCards(seat, [{ suit: "shadows", value: 2 }]);
      expect(Aragorn.objective.check(game, seat)).toBe(false);
    });
  });

  describe("objective.isCompletable", () => {
    test("returns true when no threat card set", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      seat.threatCard = null;
      expect(Aragorn.objective.isCompletable(game, seat)).toBe(true);
    });

    test("returns false when already over target", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      seat.threatCard = 2;
      addWonCards(seat, [{ suit: "mountains", value: 1 }]);
      addWonCards(seat, [{ suit: "shadows", value: 2 }]);
      addWonCards(seat, [{ suit: "forests", value: 3 }]);
      expect(Aragorn.objective.isCompletable(game, seat)).toBe(false);
    });

    test("returns true when at target (still completable even if exactly there)", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      seat.threatCard = 2;
      addWonCards(seat, [{ suit: "mountains", value: 1 }]);
      addWonCards(seat, [{ suit: "shadows", value: 2 }]);
      expect(Aragorn.objective.isCompletable(game, seat)).toBe(true);
    });

    test("returns true when enough tricks remain to reach target", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      seat.threatCard = 3;
      // No tricks won, need 3 more, tricksRemaining = 9 (default)
      expect(Aragorn.objective.isCompletable(game, seat)).toBe(true);
    });

    test("returns false when not enough tricks remain to reach target", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      seat.threatCard = 8;
      // No tricks won, need 8 more, but only 2 tricks remain
      game.currentTrickNumber = 7; // tricksRemaining = 9 - 7 = 2
      expect(Aragorn.objective.isCompletable(game, seat)).toBe(false);
    });

    test("returns true when exactly enough tricks remain", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      seat.threatCard = 5;
      addWonCards(seat, [{ suit: "mountains", value: 1 }]);
      addWonCards(seat, [{ suit: "shadows", value: 2 }]);
      // 2 tricks won, need 3 more to reach 5
      game.currentTrickNumber = 6; // tricksRemaining = 9 - 6 = 3
      expect(Aragorn.objective.isCompletable(game, seat)).toBe(true);
    });
  });

  describe("objective.isCompleted", () => {
    test("returns false when game not finished even if check passes", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      seat.threatCard = 2;
      // Add cards to hands so game is not finished
      for (const s of game.seats) {
        s.hand.addCard({ suit: "mountains", value: s.seatIndex + 1 });
      }
      addWonCards(seat, [{ suit: "shadows", value: 1 }]);
      addWonCards(seat, [{ suit: "forests", value: 2 }]);
      // check passes but game not finished
      expect(Aragorn.objective.check(game, seat)).toBe(true);
      expect(game.finished).toBe(false);
      expect(Aragorn.objective.isCompleted(game, seat)).toBe(false);
    });

    test("returns true when game finished and check passes", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      seat.threatCard = 2;
      addWonCards(seat, [{ suit: "mountains", value: 1 }]);
      addWonCards(seat, [{ suit: "shadows", value: 2 }]);
      // Game is finished since all hands are empty
      expect(game.finished).toBe(true);
      expect(Aragorn.objective.isCompleted(game, seat)).toBe(true);
    });

    test("returns false when game finished but check fails", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      seat.threatCard = 5;
      addWonCards(seat, [{ suit: "mountains", value: 1 }]);
      addWonCards(seat, [{ suit: "shadows", value: 2 }]);
      // Game is finished since all hands are empty
      expect(game.finished).toBe(true);
      expect(Aragorn.objective.isCompleted(game, seat)).toBe(false);
    });
  });

  describe("display.renderStatus", () => {
    test("returns status with threat card display", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      seat.threatCard = 3;
      const status = Aragorn.display.renderStatus(game, seat);
      expect(status.met).toBe(false);
      expect(status.completable).toBe(true);
      expect(status.completed).toBe(false);
    });

    test("shows met=true when at target (game not finished)", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      seat.threatCard = 2;
      // Add cards to hands so game is not finished
      for (const s of game.seats) {
        s.hand.addCard({ suit: "forests", value: s.seatIndex + 1 });
      }
      addWonCards(seat, [{ suit: "mountains", value: 1 }]);
      addWonCards(seat, [{ suit: "shadows", value: 2 }]);
      expect(game.finished).toBe(false);
      const status = Aragorn.display.renderStatus(game, seat);
      expect(status.met).toBe(true);
      expect(status.completable).toBe(true);
      expect(status.completed).toBe(false);
    });

    test("shows completed=true when game finished and at target", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      seat.threatCard = 2;
      addWonCards(seat, [{ suit: "mountains", value: 1 }]);
      addWonCards(seat, [{ suit: "shadows", value: 2 }]);
      // Game is finished since all hands are empty
      expect(game.finished).toBe(true);
      const status = Aragorn.display.renderStatus(game, seat);
      expect(status.met).toBe(true);
      expect(status.completable).toBe(true);
      expect(status.completed).toBe(true);
    });

    test("shows completable=false when over target", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      seat.threatCard = 1;
      addWonCards(seat, [{ suit: "mountains", value: 1 }]);
      addWonCards(seat, [{ suit: "shadows", value: 2 }]);
      const status = Aragorn.display.renderStatus(game, seat);
      expect(status.met).toBe(false);
      expect(status.completable).toBe(false);
      expect(status.completed).toBe(false);
    });
  });

  describe("metadata", () => {
    test("has correct name", () => {
      expect(Aragorn.name).toBe("Aragorn");
    });

    test("has correct setupText", () => {
      expect(Aragorn.setupText).toBe(
        "Choose a threat card, then exchange with Gimli or Legolas"
      );
    });

    test("has correct objective text", () => {
      expect(Aragorn.objective.text).toBe(
        "Win exactly the number of tricks shown on your threat card"
      );
    });
  });
});
