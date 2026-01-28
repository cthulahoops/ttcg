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
  describe("objective.getStatus", () => {
    test("returns { tentative, failure } when no threat card set", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      // Add cards to hands so game is not finished
      for (const s of game.seats) {
        s.hand.addCard({ suit: "forests", value: s.seatIndex + 1 });
      }
      seat.threatCard = null;
      expect(Aragorn.objective.getStatus(game, seat)).toEqual({
        finality: "tentative",
        outcome: "failure",
      });
    });

    test("returns { tentative, success } when trick count equals threat card (game not finished)", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      // Add cards to hands so game is not finished
      for (const s of game.seats) {
        s.hand.addCard({ suit: "forests", value: s.seatIndex + 1 });
      }
      seat.threatCard = 2;
      addWonCards(seat, [{ suit: "mountains", value: 1 }]);
      addWonCards(seat, [{ suit: "shadows", value: 2 }]);
      expect(Aragorn.objective.getStatus(game, seat)).toEqual({
        finality: "tentative",
        outcome: "success",
      });
    });

    test("returns { final, success } when game finished and trick count equals threat card", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      seat.threatCard = 2;
      addWonCards(seat, [{ suit: "mountains", value: 1 }]);
      addWonCards(seat, [{ suit: "shadows", value: 2 }]);
      game.currentTrickNumber = 9;
      expect(game.finished).toBe(true);
      expect(Aragorn.objective.getStatus(game, seat)).toEqual({
        finality: "final",
        outcome: "success",
      });
    });

    test("returns { final, failure } when already over target", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      seat.threatCard = 2;
      addWonCards(seat, [{ suit: "mountains", value: 1 }]);
      addWonCards(seat, [{ suit: "shadows", value: 2 }]);
      addWonCards(seat, [{ suit: "forests", value: 3 }]);
      expect(Aragorn.objective.getStatus(game, seat)).toEqual({
        finality: "final",
        outcome: "failure",
      });
    });

    test("returns { final, failure } when not enough tricks remain to reach target", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      seat.threatCard = 8;
      // No tricks won, need 8 more, but only 2 tricks remain
      game.currentTrickNumber = 7; // tricksRemaining = 9 - 7 = 2
      expect(Aragorn.objective.getStatus(game, seat)).toEqual({
        finality: "final",
        outcome: "failure",
      });
    });

    test("returns { final, failure } when game finished but below target", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      seat.threatCard = 5;
      addWonCards(seat, [{ suit: "mountains", value: 1 }]);
      addWonCards(seat, [{ suit: "shadows", value: 2 }]);
      game.currentTrickNumber = 9; // tricksRemaining = 9 - 9 = 0
      expect(game.finished).toBe(true);
      expect(Aragorn.objective.getStatus(game, seat)).toEqual({
        finality: "final",
        outcome: "failure",
      });
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
