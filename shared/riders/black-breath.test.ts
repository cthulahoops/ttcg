import { describe, expect, test } from "bun:test";
import { BlackBreath } from "./black-breath";
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
function createTestGame(
  numCharacters: number,
  lostCard: Card = { suit: "mountains", value: 1 }
): Game {
  const seats: Seat[] = [];
  for (let i = 0; i < numCharacters; i++) {
    const controller = new TestController();
    const hand = new PlayerHand();
    seats.push(new Seat(i, controller, hand, false));
  }
  return new Game(numCharacters, numCharacters, seats, lostCard, 0);
}

// Test helper: add won cards to a seat
function addWonCards(seat: Seat, cards: Card[]): void {
  seat.addTrick(seat.tricksWon.length, cards);
}

describe("BlackBreath", () => {
  describe("objective.getStatus", () => {
    test("returns { tentative, success } when no 8s won and game not finished", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      // Add cards to hands so game is not finished
      for (const s of game.seats) {
        s.hand.addCard({ suit: "forests", value: s.seatIndex + 1 });
      }
      expect(BlackBreath.objective.getStatus(game, seat)).toEqual({
        finality: "tentative",
        outcome: "success",
      });
    });

    test("returns { final, failure } when player wins an 8", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      addWonCards(seat, [{ suit: "mountains", value: 8 }]);
      expect(BlackBreath.objective.getStatus(game, seat)).toEqual({
        finality: "final",
        outcome: "failure",
      });
    });

    test("returns { final, failure } when player wins multiple 8s", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      addWonCards(seat, [
        { suit: "mountains", value: 8 },
        { suit: "shadows", value: 8 },
      ]);
      expect(BlackBreath.objective.getStatus(game, seat)).toEqual({
        finality: "final",
        outcome: "failure",
      });
    });

    test("returns { final, success } when game is finished and no 8s won", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      // Empty hands = game finished
      expect(BlackBreath.objective.getStatus(game, seat)).toEqual({
        finality: "final",
        outcome: "success",
      });
    });

    test("returns { final, success } when all 8s are won by other players", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      const otherSeat = game.seats[1]!;
      // Add cards to hands so game is not finished
      for (const s of game.seats) {
        s.hand.addCard({ suit: "rings", value: s.seatIndex + 1 });
      }
      // Other player wins all four 8s
      addWonCards(otherSeat, [
        { suit: "mountains", value: 8 },
        { suit: "shadows", value: 8 },
        { suit: "forests", value: 8 },
        { suit: "hills", value: 8 },
      ]);
      expect(BlackBreath.objective.getStatus(game, seat)).toEqual({
        finality: "final",
        outcome: "success",
      });
    });

    test("returns { final, success } when 8s are split between other players", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      // Add cards to hands so game is not finished
      for (const s of game.seats) {
        s.hand.addCard({ suit: "rings", value: s.seatIndex + 1 });
      }
      // 8s are split among other players
      addWonCards(game.seats[1]!, [
        { suit: "mountains", value: 8 },
        { suit: "shadows", value: 8 },
      ]);
      addWonCards(game.seats[2]!, [{ suit: "forests", value: 8 }]);
      addWonCards(game.seats[3]!, [{ suit: "hills", value: 8 }]);
      expect(BlackBreath.objective.getStatus(game, seat)).toEqual({
        finality: "final",
        outcome: "success",
      });
    });

    test("returns { tentative, success } when only some 8s are gone", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      const otherSeat = game.seats[1]!;
      // Add cards to hands so game is not finished
      for (const s of game.seats) {
        s.hand.addCard({ suit: "rings", value: s.seatIndex + 1 });
      }
      // Only some 8s are gone
      addWonCards(otherSeat, [
        { suit: "mountains", value: 8 },
        { suit: "shadows", value: 8 },
      ]);
      expect(BlackBreath.objective.getStatus(game, seat)).toEqual({
        finality: "tentative",
        outcome: "success",
      });
    });

    test("returns { final, success } when some 8s are won by others and one is the lost card", () => {
      // Lost card is an 8
      const game = createTestGame(4, { suit: "mountains", value: 8 });
      const seat = game.seats[0]!;
      const otherSeat = game.seats[1]!;
      // Add cards to hands so game is not finished
      for (const s of game.seats) {
        s.hand.addCard({ suit: "rings", value: s.seatIndex + 1 });
      }
      // Other 8s won by others (mountains 8 is lost card)
      addWonCards(otherSeat, [
        { suit: "shadows", value: 8 },
        { suit: "forests", value: 8 },
        { suit: "hills", value: 8 },
      ]);
      expect(BlackBreath.objective.getStatus(game, seat)).toEqual({
        finality: "final",
        outcome: "success",
      });
    });

    test("returns { tentative, success } when one 8 is lost but others still available", () => {
      // Lost card is an 8
      const game = createTestGame(4, { suit: "mountains", value: 8 });
      const seat = game.seats[0]!;
      // Add cards to hands so game is not finished
      for (const s of game.seats) {
        s.hand.addCard({ suit: "rings", value: s.seatIndex + 1 });
      }
      // Only mountains 8 is accounted for (as lost card)
      expect(BlackBreath.objective.getStatus(game, seat)).toEqual({
        finality: "tentative",
        outcome: "success",
      });
    });

    test("ignores non-8 cards won by player", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      // Add cards to hands so game is not finished
      for (const s of game.seats) {
        s.hand.addCard({ suit: "rings", value: s.seatIndex + 1 });
      }
      addWonCards(seat, [
        { suit: "mountains", value: 1 },
        { suit: "shadows", value: 7 },
        { suit: "forests", value: 5 },
        { suit: "hills", value: 3 },
      ]);
      expect(BlackBreath.objective.getStatus(game, seat)).toEqual({
        finality: "tentative",
        outcome: "success",
      });
    });
  });

  describe("display.getObjectiveCards", () => {
    test("returns empty array when no 8s won", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      const result = BlackBreath.display.getObjectiveCards!(game, seat);
      expect(result.cards).toEqual([]);
    });

    test("returns won 8s", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      addWonCards(seat, [
        { suit: "mountains", value: 8 },
        { suit: "forests", value: 3 },
        { suit: "shadows", value: 8 },
      ]);
      const result = BlackBreath.display.getObjectiveCards!(game, seat);
      expect(result.cards).toEqual([
        { suit: "mountains", value: 8 },
        { suit: "shadows", value: 8 },
      ]);
    });
  });

  describe("metadata", () => {
    test("has correct name", () => {
      expect(BlackBreath.name).toBe("The Black Breath");
    });

    test("has correct objective text", () => {
      expect(BlackBreath.objective.text).toBe("Win no rank 8 cards");
    });
  });
});
