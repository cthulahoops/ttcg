import { describe, expect, test } from "bun:test";
import { Gimli } from "./gimli";
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

describe("Gimli", () => {
  describe("objective.getStatus", () => {
    test("returns { tentative, failure } when no threat card assigned", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      expect(Gimli.objective.getStatus(game, seat)).toEqual({
        finality: "tentative",
        outcome: "failure",
      });
    });

    test("returns { tentative, failure } when threat card assigned but not won", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      seat.threatCard = 5;
      expect(Gimli.objective.getStatus(game, seat)).toEqual({
        finality: "tentative",
        outcome: "failure",
      });
    });

    test("returns { tentative, failure } when different mountains card won", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      seat.threatCard = 5;
      addWonCards(seat, [{ suit: "mountains", value: 3 }]);
      expect(Gimli.objective.getStatus(game, seat)).toEqual({
        finality: "tentative",
        outcome: "failure",
      });
    });

    test("returns { final, success } when matching mountains card won", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      seat.threatCard = 5;
      addWonCards(seat, [{ suit: "mountains", value: 5 }]);
      expect(Gimli.objective.getStatus(game, seat)).toEqual({
        finality: "final",
        outcome: "success",
      });
    });

    test("returns { final, success } when matching mountains card is among other cards", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      seat.threatCard = 3;
      addWonCards(seat, [
        { suit: "forests", value: 1 },
        { suit: "mountains", value: 3 },
        { suit: "shadows", value: 7 },
      ]);
      expect(Gimli.objective.getStatus(game, seat)).toEqual({
        finality: "final",
        outcome: "success",
      });
    });

    test("ignores non-mountains cards with matching value", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      seat.threatCard = 5;
      addWonCards(seat, [
        { suit: "forests", value: 5 },
        { suit: "shadows", value: 5 },
        { suit: "hills", value: 5 },
      ]);
      expect(Gimli.objective.getStatus(game, seat)).toEqual({
        finality: "tentative",
        outcome: "failure",
      });
    });

    test("returns { final, failure } when another player has won the threat card", () => {
      const game = createTestGame(4);
      const gimliSeat = game.seats[0]!;
      const otherSeat = game.seats[1]!;
      gimliSeat.threatCard = 5;
      addWonCards(otherSeat, [{ suit: "mountains", value: 5 }]);
      expect(Gimli.objective.getStatus(game, gimliSeat)).toEqual({
        finality: "final",
        outcome: "failure",
      });
    });

    test("returns { tentative, failure } when another player won a different mountains card", () => {
      const game = createTestGame(4);
      const gimliSeat = game.seats[0]!;
      const otherSeat = game.seats[1]!;
      gimliSeat.threatCard = 5;
      addWonCards(otherSeat, [{ suit: "mountains", value: 3 }]);
      expect(Gimli.objective.getStatus(game, gimliSeat)).toEqual({
        finality: "tentative",
        outcome: "failure",
      });
    });
  });

  describe("metadata", () => {
    test("has correct name", () => {
      expect(Gimli.name).toBe("Gimli");
    });

    test("has correct setupText", () => {
      expect(Gimli.setupText).toBe(
        "Draw a Mountains threat card, then exchange with Legolas or Aragorn"
      );
    });

    test("has correct objective text", () => {
      expect(Gimli.objective.text).toBe(
        "Win the Mountains card matching your threat card"
      );
    });
  });
});
