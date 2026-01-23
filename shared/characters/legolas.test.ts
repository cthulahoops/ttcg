import { describe, expect, test } from "bun:test";
import { Legolas } from "./legolas";
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

describe("Legolas", () => {
  describe("objective.getStatus", () => {
    test("returns { tentative, failure } when no threat card assigned", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      expect(Legolas.objective.getStatus(game, seat)).toEqual({
        finality: "tentative",
        outcome: "failure",
      });
    });

    test("returns { tentative, failure } when threat card assigned but not won", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      seat.threatCard = 5;
      expect(Legolas.objective.getStatus(game, seat)).toEqual({
        finality: "tentative",
        outcome: "failure",
      });
    });

    test("returns { tentative, failure } when different forests card won", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      seat.threatCard = 5;
      addWonCards(seat, [{ suit: "forests", value: 3 }]);
      expect(Legolas.objective.getStatus(game, seat)).toEqual({
        finality: "tentative",
        outcome: "failure",
      });
    });

    test("returns { final, success } when matching forests card won", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      seat.threatCard = 5;
      addWonCards(seat, [{ suit: "forests", value: 5 }]);
      expect(Legolas.objective.getStatus(game, seat)).toEqual({
        finality: "final",
        outcome: "success",
      });
    });

    test("returns { final, success } when matching forests card is among other cards", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      seat.threatCard = 3;
      addWonCards(seat, [
        { suit: "mountains", value: 1 },
        { suit: "forests", value: 3 },
        { suit: "shadows", value: 7 },
      ]);
      expect(Legolas.objective.getStatus(game, seat)).toEqual({
        finality: "final",
        outcome: "success",
      });
    });

    test("ignores non-forests cards with matching value", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      seat.threatCard = 5;
      addWonCards(seat, [
        { suit: "mountains", value: 5 },
        { suit: "shadows", value: 5 },
        { suit: "hills", value: 5 },
      ]);
      expect(Legolas.objective.getStatus(game, seat)).toEqual({
        finality: "tentative",
        outcome: "failure",
      });
    });

    test("returns { final, failure } when another player has won the threat card", () => {
      const game = createTestGame(4);
      const legolasSeat = game.seats[0]!;
      const otherSeat = game.seats[1]!;
      legolasSeat.threatCard = 5;
      addWonCards(otherSeat, [{ suit: "forests", value: 5 }]);
      expect(Legolas.objective.getStatus(game, legolasSeat)).toEqual({
        finality: "final",
        outcome: "failure",
      });
    });

    test("returns { tentative, failure } when another player won a different forests card", () => {
      const game = createTestGame(4);
      const legolasSeat = game.seats[0]!;
      const otherSeat = game.seats[1]!;
      legolasSeat.threatCard = 5;
      addWonCards(otherSeat, [{ suit: "forests", value: 3 }]);
      expect(Legolas.objective.getStatus(game, legolasSeat)).toEqual({
        finality: "tentative",
        outcome: "failure",
      });
    });
  });

  describe("metadata", () => {
    test("has correct name", () => {
      expect(Legolas.name).toBe("Legolas");
    });

    test("has correct setupText", () => {
      expect(Legolas.setupText).toBe(
        "Draw a Forests threat card, then exchange with Gimli or Aragorn"
      );
    });

    test("has correct objective text", () => {
      expect(Legolas.objective.text).toBe(
        "Win the Forests card matching your threat card"
      );
    });
  });
});
