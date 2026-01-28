import { describe, expect, test } from "bun:test";
import { Arwen } from "./arwen";
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

describe("Arwen", () => {
  describe("objective.getStatus", () => {
    test("returns { tentative, failure } when no forests won (game not finished)", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      // Add cards to hands so game is not finished
      for (const s of game.seats) {
        s.hand.addCard({ suit: "mountains", value: s.seatIndex + 1 });
      }
      expect(Arwen.objective.getStatus(game, seat)).toEqual({
        finality: "tentative",
        outcome: "failure",
      });
    });

    test("returns { tentative, success } when has more forests than all others (game not finished)", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      // Add cards to hands so game is not finished
      for (const s of game.seats) {
        s.hand.addCard({ suit: "mountains", value: s.seatIndex + 1 });
      }
      addWonCards(seat, [
        { suit: "forests", value: 1 },
        { suit: "forests", value: 2 },
      ]);
      expect(Arwen.objective.getStatus(game, seat)).toEqual({
        finality: "tentative",
        outcome: "success",
      });
    });

    test("returns { final, success } when has more forests than all others (game finished)", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      addWonCards(seat, [
        { suit: "forests", value: 1 },
        { suit: "forests", value: 2 },
      ]);
      game.currentTrickNumber = 9;
      expect(game.finished).toBe(true);
      expect(Arwen.objective.getStatus(game, seat)).toEqual({
        finality: "final",
        outcome: "success",
      });
    });

    test("returns { tentative, failure } when tied for most forests (game not finished)", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      const otherSeat = game.seats[1]!;
      // Add cards to hands so game is not finished
      for (const s of game.seats) {
        s.hand.addCard({ suit: "mountains", value: s.seatIndex + 1 });
      }
      addWonCards(seat, [{ suit: "forests", value: 1 }]);
      addWonCards(otherSeat, [{ suit: "forests", value: 2 }]);
      expect(Arwen.objective.getStatus(game, seat)).toEqual({
        finality: "tentative",
        outcome: "failure",
      });
    });

    test("returns { final, failure } when tied for most forests (game finished)", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      const otherSeat = game.seats[1]!;
      addWonCards(seat, [{ suit: "forests", value: 1 }]);
      addWonCards(otherSeat, [{ suit: "forests", value: 2 }]);
      game.currentTrickNumber = 9;
      expect(game.finished).toBe(true);
      expect(Arwen.objective.getStatus(game, seat)).toEqual({
        finality: "final",
        outcome: "failure",
      });
    });

    test("returns { tentative, failure } when another player has more forests", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      const otherSeat = game.seats[1]!;
      // Add cards to hands so game is not finished
      for (const s of game.seats) {
        s.hand.addCard({ suit: "mountains", value: s.seatIndex + 1 });
      }
      addWonCards(seat, [{ suit: "forests", value: 1 }]);
      addWonCards(otherSeat, [
        { suit: "forests", value: 2 },
        { suit: "forests", value: 3 },
      ]);
      expect(Arwen.objective.getStatus(game, seat)).toEqual({
        finality: "tentative",
        outcome: "failure",
      });
    });

    test("ignores non-forests cards when counting", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      // Add cards to hands so game is not finished
      for (const s of game.seats) {
        s.hand.addCard({ suit: "forests", value: s.seatIndex + 1 });
      }
      addWonCards(seat, [
        { suit: "mountains", value: 1 },
        { suit: "shadows", value: 2 },
        { suit: "hills", value: 3 },
        { suit: "rings", value: 1 },
      ]);
      expect(Arwen.objective.getStatus(game, seat)).toEqual({
        finality: "tentative",
        outcome: "failure",
      });
    });

    test("counts forests across multiple tricks", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      addWonCards(seat, [{ suit: "forests", value: 1 }]);
      addWonCards(seat, [{ suit: "forests", value: 2 }]);
      addWonCards(seat, [{ suit: "forests", value: 3 }]);
      game.currentTrickNumber = 9;
      expect(Arwen.objective.getStatus(game, seat)).toEqual({
        finality: "final",
        outcome: "success",
      });
    });

    test("returns { final, failure } when others have too many forests to overtake", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      const otherSeat = game.seats[1]!;
      // Add cards to hands so game is not finished
      for (const s of game.seats) {
        s.hand.addCard({ suit: "mountains", value: s.seatIndex + 1 });
      }
      // Other has 5 forests, only 3 remain for Arwen - can't exceed 5
      addWonCards(otherSeat, [
        { suit: "forests", value: 1 },
        { suit: "forests", value: 2 },
        { suit: "forests", value: 3 },
        { suit: "forests", value: 4 },
        { suit: "forests", value: 5 },
      ]);
      expect(Arwen.objective.getStatus(game, seat)).toEqual({
        finality: "final",
        outcome: "failure",
      });
    });

    test("returns { final, failure } when tied and no forests remain", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      const otherSeat = game.seats[1]!;
      // Both have 4 forests, no remaining forests to break tie
      addWonCards(seat, [
        { suit: "forests", value: 1 },
        { suit: "forests", value: 2 },
        { suit: "forests", value: 3 },
        { suit: "forests", value: 4 },
      ]);
      addWonCards(otherSeat, [
        { suit: "forests", value: 5 },
        { suit: "forests", value: 6 },
        { suit: "forests", value: 7 },
        { suit: "forests", value: 8 },
      ]);
      expect(Arwen.objective.getStatus(game, seat)).toEqual({
        finality: "final",
        outcome: "failure",
      });
    });

    test("returns { final, success } early when guaranteed to have most forests", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      // Add cards to hands so game is not finished
      for (const s of game.seats) {
        s.hand.addCard({ suit: "mountains", value: s.seatIndex + 1 });
      }
      expect(game.finished).toBe(false);
      // Arwen has 6 forests, others have 0, only 2 forests remain
      // Others can at most get 2, so Arwen is guaranteed to have most
      addWonCards(seat, [
        { suit: "forests", value: 1 },
        { suit: "forests", value: 2 },
        { suit: "forests", value: 3 },
        { suit: "forests", value: 4 },
        { suit: "forests", value: 5 },
        { suit: "forests", value: 6 },
      ]);
      expect(Arwen.objective.getStatus(game, seat)).toEqual({
        finality: "final",
        outcome: "success",
      });
    });

    test("returns { tentative, success } when leading but not guaranteed", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      const otherSeat = game.seats[1]!;
      // Add cards to hands so game is not finished
      for (const s of game.seats) {
        s.hand.addCard({ suit: "mountains", value: s.seatIndex + 1 });
      }
      expect(game.finished).toBe(false);
      // Arwen has 3, other has 2, 3 forests remain
      // Other could get all 3 and have 5, tying or exceeding Arwen's 3
      addWonCards(seat, [
        { suit: "forests", value: 1 },
        { suit: "forests", value: 2 },
        { suit: "forests", value: 3 },
      ]);
      addWonCards(otherSeat, [
        { suit: "forests", value: 4 },
        { suit: "forests", value: 5 },
      ]);
      expect(Arwen.objective.getStatus(game, seat)).toEqual({
        finality: "tentative",
        outcome: "success",
      });
    });

    test("returns { final, success } early with comfortable lead", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      const otherSeat = game.seats[1]!;
      // Add cards to hands so game is not finished
      for (const s of game.seats) {
        s.hand.addCard({ suit: "mountains", value: s.seatIndex + 1 });
      }
      expect(game.finished).toBe(false);
      // Arwen has 5 forests, other has 1, 2 forests remain
      // Other could get 1+2=3, still less than 5
      addWonCards(seat, [
        { suit: "forests", value: 1 },
        { suit: "forests", value: 2 },
        { suit: "forests", value: 3 },
        { suit: "forests", value: 4 },
        { suit: "forests", value: 5 },
      ]);
      addWonCards(otherSeat, [{ suit: "forests", value: 6 }]);
      expect(Arwen.objective.getStatus(game, seat)).toEqual({
        finality: "final",
        outcome: "success",
      });
    });
  });

  describe("objective.getDetails", () => {
    test("shows 'Forests: 0' when no forests won", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      const details = Arwen.objective.getDetails!(game, seat);
      expect(details).toBe("Forests: 0");
    });

    test("shows forests count when forests won", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      addWonCards(seat, [
        { suit: "forests", value: 1 },
        { suit: "forests", value: 2 },
        { suit: "forests", value: 3 },
      ]);
      const details = Arwen.objective.getDetails!(game, seat);
      expect(details).toBe("Forests: 3");
    });
  });

  describe("metadata", () => {
    test("has correct name", () => {
      expect(Arwen.name).toBe("Arwen");
    });

    test("has correct setupText", () => {
      expect(Arwen.setupText).toBe("Exchange with Elrond or Aragorn");
    });

    test("has correct objective text", () => {
      expect(Arwen.objective.text).toBe("Win the most forests cards");
    });
  });
});
