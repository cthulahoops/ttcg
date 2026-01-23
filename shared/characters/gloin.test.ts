import { describe, expect, test } from "bun:test";
import { Gloin } from "./gloin";
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

describe("Gloin", () => {
  describe("objective.getStatus", () => {
    test("returns { tentative, failure } when no mountains won (game finished)", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      expect(Gloin.objective.getStatus(game, seat)).toEqual({
        finality: "tentative",
        outcome: "failure",
      });
    });

    test("returns { final, success } when game finished and has more mountains than all others", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      addWonCards(seat, [
        { suit: "mountains", value: 1 },
        { suit: "mountains", value: 2 },
      ]);
      expect(game.finished).toBe(true);
      expect(Gloin.objective.getStatus(game, seat)).toEqual({
        finality: "final",
        outcome: "success",
      });
    });

    test("returns { tentative, failure } when tied for most mountains", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      const otherSeat = game.seats[1]!;
      // Add cards to hands so game is not finished
      for (const s of game.seats) {
        s.hand.addCard({ suit: "forests", value: s.seatIndex + 1 });
      }
      addWonCards(seat, [{ suit: "mountains", value: 1 }]);
      addWonCards(otherSeat, [{ suit: "mountains", value: 2 }]);
      expect(Gloin.objective.getStatus(game, seat)).toEqual({
        finality: "tentative",
        outcome: "failure",
      });
    });

    test("returns { final, failure } when others have too many mountains to overtake", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      const otherSeat = game.seats[1]!;
      // Other has 5 mountains, only 3 remain for Gloin - can't exceed 5
      addWonCards(otherSeat, [
        { suit: "mountains", value: 1 },
        { suit: "mountains", value: 2 },
        { suit: "mountains", value: 3 },
        { suit: "mountains", value: 4 },
        { suit: "mountains", value: 5 },
      ]);
      expect(Gloin.objective.getStatus(game, seat)).toEqual({
        finality: "final",
        outcome: "failure",
      });
    });

    test("returns { final, success } early when guaranteed to have most mountains", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      // Add cards to hands so game is not finished
      for (const s of game.seats) {
        s.hand.addCard({ suit: "forests", value: s.seatIndex + 1 });
      }
      expect(game.finished).toBe(false);
      // Gloin has 6 mountains, others have 0, only 2 mountains remain
      // Others can at most get 2, so Gloin is guaranteed to have most
      addWonCards(seat, [
        { suit: "mountains", value: 1 },
        { suit: "mountains", value: 2 },
        { suit: "mountains", value: 3 },
        { suit: "mountains", value: 4 },
        { suit: "mountains", value: 5 },
        { suit: "mountains", value: 6 },
      ]);
      expect(Gloin.objective.getStatus(game, seat)).toEqual({
        finality: "final",
        outcome: "success",
      });
    });

    test("returns { tentative, success } when currently has most but another player could catch up", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      const otherSeat = game.seats[1]!;
      // Add cards to hands so game is not finished
      for (const s of game.seats) {
        s.hand.addCard({ suit: "forests", value: s.seatIndex + 1 });
      }
      expect(game.finished).toBe(false);
      // Gloin has 3, other has 2, 3 mountains remain
      // Other could get all 3 and have 5, tying or exceeding Gloin's 3
      addWonCards(seat, [
        { suit: "mountains", value: 1 },
        { suit: "mountains", value: 2 },
        { suit: "mountains", value: 3 },
      ]);
      addWonCards(otherSeat, [
        { suit: "mountains", value: 4 },
        { suit: "mountains", value: 5 },
      ]);
      expect(Gloin.objective.getStatus(game, seat)).toEqual({
        finality: "tentative",
        outcome: "success",
      });
    });
  });

  describe("objective.getDetails", () => {
    test("shows 'Mountains: 0' when no mountains won", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      expect(Gloin.objective.getDetails!(game, seat)).toBe("Mountains: 0");
    });

    test("shows mountains count when mountains won", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      addWonCards(seat, [
        { suit: "mountains", value: 1 },
        { suit: "mountains", value: 2 },
        { suit: "mountains", value: 3 },
      ]);
      expect(Gloin.objective.getDetails!(game, seat)).toBe("Mountains: 3");
    });
  });

  describe("metadata", () => {
    test("has correct name", () => {
      expect(Gloin.name).toBe("Gloin");
    });

    test("has correct setupText", () => {
      expect(Gloin.setupText).toBe("Exchange with Bilbo or Gimli");
    });

    test("has correct objective text", () => {
      expect(Gloin.objective.text).toBe("Win the most mountains cards");
    });
  });
});
