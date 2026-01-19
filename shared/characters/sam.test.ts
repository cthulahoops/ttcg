import { describe, expect, test } from "bun:test";
import { Sam } from "./sam";
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

describe("Sam", () => {
  describe("objective.getStatus", () => {
    test("returns [tentative, failure] when no threat card assigned", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      expect(Sam.objective.getStatus(game, seat)).toEqual([
        "tentative",
        "failure",
      ]);
    });

    test("returns [tentative, failure] when threat card assigned but not won", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      seat.threatCard = 5;
      expect(Sam.objective.getStatus(game, seat)).toEqual([
        "tentative",
        "failure",
      ]);
    });

    test("returns [tentative, failure] when different hills card won", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      seat.threatCard = 5;
      addWonCards(seat, [{ suit: "hills", value: 3 }]);
      expect(Sam.objective.getStatus(game, seat)).toEqual([
        "tentative",
        "failure",
      ]);
    });

    test("returns [final, success] when matching hills card won", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      seat.threatCard = 5;
      addWonCards(seat, [{ suit: "hills", value: 5 }]);
      expect(Sam.objective.getStatus(game, seat)).toEqual(["final", "success"]);
    });

    test("returns [final, success] when matching hills card is among other cards", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      seat.threatCard = 3;
      addWonCards(seat, [
        { suit: "mountains", value: 1 },
        { suit: "hills", value: 3 },
        { suit: "shadows", value: 7 },
      ]);
      expect(Sam.objective.getStatus(game, seat)).toEqual(["final", "success"]);
    });

    test("ignores non-hills cards with matching value", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      seat.threatCard = 5;
      addWonCards(seat, [
        { suit: "mountains", value: 5 },
        { suit: "shadows", value: 5 },
        { suit: "forests", value: 5 },
      ]);
      expect(Sam.objective.getStatus(game, seat)).toEqual([
        "tentative",
        "failure",
      ]);
    });

    test("returns [final, failure] when another player has won the threat card", () => {
      const game = createTestGame(4);
      const samSeat = game.seats[0]!;
      const otherSeat = game.seats[1]!;
      samSeat.threatCard = 5;
      addWonCards(otherSeat, [{ suit: "hills", value: 5 }]);
      expect(Sam.objective.getStatus(game, samSeat)).toEqual([
        "final",
        "failure",
      ]);
    });

    test("returns [tentative, failure] when another player won a different hills card", () => {
      const game = createTestGame(4);
      const samSeat = game.seats[0]!;
      const otherSeat = game.seats[1]!;
      samSeat.threatCard = 5;
      addWonCards(otherSeat, [{ suit: "hills", value: 3 }]);
      expect(Sam.objective.getStatus(game, samSeat)).toEqual([
        "tentative",
        "failure",
      ]);
    });
  });

  describe("metadata", () => {
    test("has correct name", () => {
      expect(Sam.name).toBe("Sam");
    });

    test("has correct setupText", () => {
      expect(Sam.setupText).toBe(
        "Draw a Hills threat card, then exchange with Frodo, Merry, or Pippin"
      );
    });
  });
});
