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
function addTrickWithNumber(
  seat: Seat,
  trickNumber: number,
  cards: Card[]
): void {
  seat.addTrick(trickNumber, cards);
}

describe("Goldberry", () => {
  describe("objective.getStatus", () => {
    test("returns { tentative, failure } when no tricks won", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      // Add cards to hands so game is not finished
      for (const s of game.seats) {
        s.hand.addCard({ suit: "forests", value: s.seatIndex + 1 });
      }
      expect(Goldberry.objective.getStatus(game, seat)).toEqual({
        finality: "tentative",
        outcome: "failure",
      });
    });

    test("returns { final, success } when exactly 3 consecutive tricks won (game finished)", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      addTrickWithNumber(seat, 0, [{ suit: "mountains", value: 1 }]);
      addTrickWithNumber(seat, 1, [{ suit: "shadows", value: 2 }]);
      addTrickWithNumber(seat, 2, [{ suit: "forests", value: 3 }]);
      expect(game.finished).toBe(true);
      expect(Goldberry.objective.getStatus(game, seat)).toEqual({
        finality: "final",
        outcome: "success",
      });
    });

    test("returns { final, failure } when more than 3 tricks won", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      addTrickWithNumber(seat, 0, [{ suit: "mountains", value: 1 }]);
      addTrickWithNumber(seat, 1, [{ suit: "shadows", value: 2 }]);
      addTrickWithNumber(seat, 2, [{ suit: "forests", value: 3 }]);
      addTrickWithNumber(seat, 3, [{ suit: "hills", value: 4 }]);
      expect(Goldberry.objective.getStatus(game, seat)).toEqual({
        finality: "final",
        outcome: "failure",
      });
    });

    test("returns { final, failure } when 3 tricks won but not consecutive", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      addTrickWithNumber(seat, 0, [{ suit: "mountains", value: 1 }]);
      addTrickWithNumber(seat, 1, [{ suit: "shadows", value: 2 }]);
      addTrickWithNumber(seat, 3, [{ suit: "forests", value: 3 }]);
      expect(Goldberry.objective.getStatus(game, seat)).toEqual({
        finality: "final",
        outcome: "failure",
      });
    });

    test("returns { final, failure } when sequence broken (missed a trick)", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      addTrickWithNumber(seat, 2, [{ suit: "mountains", value: 1 }]);
      game.currentTrickNumber = 4; // Already past trick 3, sequence broken
      expect(Goldberry.objective.getStatus(game, seat)).toEqual({
        finality: "final",
        outcome: "failure",
      });
    });

    test("returns { tentative, failure } when 2 consecutive tricks won and can continue", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      // Add cards to hands so game is not finished
      for (const s of game.seats) {
        s.hand.addCard({ suit: "forests", value: s.seatIndex + 1 });
      }
      addTrickWithNumber(seat, 3, [{ suit: "mountains", value: 1 }]);
      addTrickWithNumber(seat, 4, [{ suit: "shadows", value: 2 }]);
      game.currentTrickNumber = 5; // Next trick is 5, continues sequence
      expect(Goldberry.objective.getStatus(game, seat)).toEqual({
        finality: "tentative",
        outcome: "failure",
      });
    });

    test("returns { final, failure } when not enough tricks remaining", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      game.currentTrickNumber = 7; // Only 2 tricks remaining (7, 8)
      expect(Goldberry.objective.getStatus(game, seat)).toEqual({
        finality: "final",
        outcome: "failure",
      });
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
