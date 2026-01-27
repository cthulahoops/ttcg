import { describe, expect, test } from "bun:test";
import { Terror } from "./terror";
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

// Test helper: simulate a completed trick where a seat led with a specific card
function addCompletedTrickWithLead(
  game: Game,
  leadSeatIndex: number,
  leadCard: Card,
  otherCards: Card[]
): void {
  const plays = [
    { playerIndex: leadSeatIndex, card: leadCard, isTrump: false },
  ];
  for (let i = 0; i < otherCards.length; i++) {
    const playerIndex = (leadSeatIndex + 1 + i) % game.seats.length;
    plays.push({ playerIndex, card: otherCards[i]!, isTrump: false });
  }
  game.completedTricks.push({
    plays,
    winner: leadSeatIndex, // Doesn't matter for these tests
  });
}

describe("Terror", () => {
  describe("objective.getStatus", () => {
    test("returns { tentative, success } when no hills led and game not finished", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      // Add cards to hands so game is not finished
      for (const s of game.seats) {
        s.hand.addCard({ suit: "forests", value: s.seatIndex + 1 });
      }
      expect(Terror.objective.getStatus(game, seat)).toEqual({
        finality: "tentative",
        outcome: "success",
      });
    });

    test("returns { final, failure } when player led with a hills card", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      // Add cards to hands so game is not finished
      for (const s of game.seats) {
        s.hand.addCard({ suit: "forests", value: s.seatIndex + 1 });
      }
      // Seat 0 led with a hills card
      addCompletedTrickWithLead(game, 0, { suit: "hills", value: 1 }, [
        { suit: "hills", value: 2 },
        { suit: "forests", value: 3 },
        { suit: "mountains", value: 4 },
      ]);
      expect(Terror.objective.getStatus(game, seat)).toEqual({
        finality: "final",
        outcome: "failure",
      });
    });

    test("returns { tentative, success } when another player led with hills", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      // Add cards to hands so game is not finished
      for (const s of game.seats) {
        s.hand.addCard({ suit: "forests", value: s.seatIndex + 1 });
      }
      // Seat 1 led with a hills card (not our seat)
      addCompletedTrickWithLead(game, 1, { suit: "hills", value: 1 }, [
        { suit: "hills", value: 2 },
        { suit: "forests", value: 3 },
        { suit: "mountains", value: 4 },
      ]);
      expect(Terror.objective.getStatus(game, seat)).toEqual({
        finality: "tentative",
        outcome: "success",
      });
    });

    test("returns { final, success } when game is finished and no hills led", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      // Empty hands = game finished
      expect(Terror.objective.getStatus(game, seat)).toEqual({
        finality: "final",
        outcome: "success",
      });
    });

    test("returns { final, success } when all hills cards have been played", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      const otherSeat = game.seats[1]!;
      // Add cards to hands so game is not finished
      for (const s of game.seats) {
        s.hand.addCard({ suit: "forests", value: s.seatIndex + 1 });
      }
      // All 8 hills cards have been won by other players
      addWonCards(otherSeat, [
        { suit: "hills", value: 1 },
        { suit: "hills", value: 2 },
        { suit: "hills", value: 3 },
        { suit: "hills", value: 4 },
        { suit: "hills", value: 5 },
        { suit: "hills", value: 6 },
        { suit: "hills", value: 7 },
        { suit: "hills", value: 8 },
      ]);
      expect(Terror.objective.getStatus(game, seat)).toEqual({
        finality: "final",
        outcome: "success",
      });
    });

    test("returns { final, success } when some hills won and one is lost card", () => {
      // Lost card is a hills card
      const game = createTestGame(4, { suit: "hills", value: 8 });
      const seat = game.seats[0]!;
      const otherSeat = game.seats[1]!;
      // Add cards to hands so game is not finished
      for (const s of game.seats) {
        s.hand.addCard({ suit: "forests", value: s.seatIndex + 1 });
      }
      // 7 hills cards won (hills 8 is lost card)
      addWonCards(otherSeat, [
        { suit: "hills", value: 1 },
        { suit: "hills", value: 2 },
        { suit: "hills", value: 3 },
        { suit: "hills", value: 4 },
        { suit: "hills", value: 5 },
        { suit: "hills", value: 6 },
        { suit: "hills", value: 7 },
      ]);
      expect(Terror.objective.getStatus(game, seat)).toEqual({
        finality: "final",
        outcome: "success",
      });
    });

    test("returns { tentative, success } when only some hills are gone", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      const otherSeat = game.seats[1]!;
      // Add cards to hands so game is not finished
      for (const s of game.seats) {
        s.hand.addCard({ suit: "forests", value: s.seatIndex + 1 });
      }
      // Only some hills cards have been won
      addWonCards(otherSeat, [
        { suit: "hills", value: 1 },
        { suit: "hills", value: 2 },
        { suit: "hills", value: 3 },
      ]);
      expect(Terror.objective.getStatus(game, seat)).toEqual({
        finality: "tentative",
        outcome: "success",
      });
    });
  });

  describe("metadata", () => {
    test("has correct name", () => {
      expect(Terror.name).toBe("Terror");
    });

    test("has correct objective text", () => {
      expect(Terror.objective.text).toBe("Do not lead with a hills card");
    });
  });
});
