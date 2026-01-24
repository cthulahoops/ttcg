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
  describe("objective.getStatus", () => {
    test("returns { tentative, failure } when no tricks have been played (game not finished)", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      // Add cards to hands so game is not finished
      for (const s of game.seats) {
        s.hand.addCard({ suit: "mountains", value: s.seatIndex + 1 });
      }
      expect(Boromir.objective.getStatus(game, seat)).toEqual({
        finality: "tentative",
        outcome: "failure",
      });
    });

    test("returns { tentative, failure } when Boromir did not win the last trick", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      // Add cards to hands so game is not finished
      for (const s of game.seats) {
        s.hand.addCard({ suit: "mountains", value: s.seatIndex + 1 });
      }
      game.lastTrickWinner = 1; // Someone else won
      expect(Boromir.objective.getStatus(game, seat)).toEqual({
        finality: "tentative",
        outcome: "failure",
      });
    });

    test("returns { final, failure } when Boromir has 1 of Rings", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      game.lastTrickWinner = 0;
      addWonCards(seat, [{ suit: "rings", value: 1 }]);
      expect(Boromir.objective.getStatus(game, seat)).toEqual({
        finality: "final",
        outcome: "failure",
      });
    });

    test("returns { tentative, success } when Boromir won the last trick without 1 of Rings (game not finished)", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      // Add cards to hands so game is not finished
      for (const s of game.seats) {
        s.hand.addCard({ suit: "mountains", value: s.seatIndex + 1 });
      }
      game.lastTrickWinner = 0;
      expect(Boromir.objective.getStatus(game, seat)).toEqual({
        finality: "tentative",
        outcome: "success",
      });
    });

    test("returns { final, success } when Boromir won the last trick without 1 of Rings (game finished)", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      game.lastTrickWinner = 0;
      expect(game.finished).toBe(true);
      expect(Boromir.objective.getStatus(game, seat)).toEqual({
        finality: "final",
        outcome: "success",
      });
    });

    test("returns { tentative, success } when Boromir won the last trick with other rings cards", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      // Add cards to hands so game is not finished
      for (const s of game.seats) {
        s.hand.addCard({ suit: "mountains", value: s.seatIndex + 1 });
      }
      game.lastTrickWinner = 0;
      addWonCards(seat, [
        { suit: "rings", value: 2 },
        { suit: "rings", value: 3 },
        { suit: "rings", value: 5 },
      ]);
      expect(Boromir.objective.getStatus(game, seat)).toEqual({
        finality: "tentative",
        outcome: "success",
      });
    });

    test("works correctly for different seat indices", () => {
      const game = createTestGame(4);
      const seat = game.seats[2]!;
      // Add cards to hands so game is not finished
      for (const s of game.seats) {
        s.hand.addCard({ suit: "mountains", value: s.seatIndex + 1 });
      }
      game.lastTrickWinner = 2;
      expect(Boromir.objective.getStatus(game, seat)).toEqual({
        finality: "tentative",
        outcome: "success",
      });
    });

    test("returns { final, failure } when game finished but Boromir did not win last trick", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      game.lastTrickWinner = 1;
      expect(game.finished).toBe(true);
      expect(Boromir.objective.getStatus(game, seat)).toEqual({
        finality: "final",
        outcome: "failure",
      });
    });
  });

  describe("objective.getDetails", () => {
    test("shows correct details with last trick status", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      game.lastTrickWinner = 0;
      const details = Boromir.objective.getDetails!(game, seat);
      expect(details).toContain("Last: yes");
      expect(details).toContain("1-Ring: ok");
    });

    test("shows correct details when has 1 of Rings", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      game.lastTrickWinner = 0;
      addWonCards(seat, [{ suit: "rings", value: 1 }]);
      const details = Boromir.objective.getDetails!(game, seat);
      expect(details).toContain("Last: yes");
      expect(details).toContain("has 1-Ring");
    });

    test("shows correct details when not winning last trick", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      game.lastTrickWinner = 1;
      const details = Boromir.objective.getDetails!(game, seat);
      expect(details).toContain("Last: no");
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
