import { describe, expect, test } from "bun:test";
import { MorgulKnife } from "./morgul-knife";
import { Game } from "../game";
import { Seat } from "../seat";
import { PlayerHand } from "../hands";
import { Controller } from "../controllers";
import type { Card, Suit } from "../types";

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
  const plays = [{ playerIndex: leadSeatIndex, card: leadCard, isTrump: false }];
  for (let i = 0; i < otherCards.length; i++) {
    const playerIndex = (leadSeatIndex + 1 + i) % game.seats.length;
    plays.push({ playerIndex, card: otherCards[i]!, isTrump: false });
  }
  game.completedTricks.push({
    number: game.completedTricks.length,
    leadSuit: leadCard.suit as Suit,
    plays,
  });
}

describe("MorgulKnife", () => {
  describe("objective.getStatus", () => {
    test("returns { tentative, success } when no rings led and game not finished", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      // Add cards to hands so game is not finished
      for (const s of game.seats) {
        s.hand.addCard({ suit: "forests", value: s.seatIndex + 1 });
      }
      expect(MorgulKnife.objective.getStatus(game, seat)).toEqual({
        finality: "tentative",
        outcome: "success",
      });
    });

    test("returns { final, failure } when player led with a ring card", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      // Add cards to hands so game is not finished
      for (const s of game.seats) {
        s.hand.addCard({ suit: "forests", value: s.seatIndex + 1 });
      }
      // Seat 0 led with a ring card
      addCompletedTrickWithLead(game, 0, { suit: "rings", value: 1 }, [
        { suit: "rings", value: 2 },
        { suit: "forests", value: 3 },
        { suit: "hills", value: 4 },
      ]);
      expect(MorgulKnife.objective.getStatus(game, seat)).toEqual({
        finality: "final",
        outcome: "failure",
      });
    });

    test("returns { tentative, success } when another player led with rings", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      // Add cards to hands so game is not finished
      for (const s of game.seats) {
        s.hand.addCard({ suit: "forests", value: s.seatIndex + 1 });
      }
      // Seat 1 led with a ring card (not our seat)
      addCompletedTrickWithLead(game, 1, { suit: "rings", value: 1 }, [
        { suit: "rings", value: 2 },
        { suit: "forests", value: 3 },
        { suit: "hills", value: 4 },
      ]);
      expect(MorgulKnife.objective.getStatus(game, seat)).toEqual({
        finality: "tentative",
        outcome: "success",
      });
    });

    test("returns { final, success } when game is finished and no rings led", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      // Empty hands = game finished
      expect(MorgulKnife.objective.getStatus(game, seat)).toEqual({
        finality: "final",
        outcome: "success",
      });
    });

    test("returns { final, success } when all ring cards have been played", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      const otherSeat = game.seats[1]!;
      // Add cards to hands so game is not finished
      for (const s of game.seats) {
        s.hand.addCard({ suit: "forests", value: s.seatIndex + 1 });
      }
      // All 5 ring cards have been won by other players
      addWonCards(otherSeat, [
        { suit: "rings", value: 1 },
        { suit: "rings", value: 2 },
        { suit: "rings", value: 3 },
        { suit: "rings", value: 4 },
        { suit: "rings", value: 5 },
      ]);
      expect(MorgulKnife.objective.getStatus(game, seat)).toEqual({
        finality: "final",
        outcome: "success",
      });
    });

    test("returns { final, success } when some rings won and one is lost card", () => {
      // Lost card is a ring
      const game = createTestGame(4, { suit: "rings", value: 5 });
      const seat = game.seats[0]!;
      const otherSeat = game.seats[1]!;
      // Add cards to hands so game is not finished
      for (const s of game.seats) {
        s.hand.addCard({ suit: "forests", value: s.seatIndex + 1 });
      }
      // 4 ring cards won (rings 5 is lost card)
      addWonCards(otherSeat, [
        { suit: "rings", value: 1 },
        { suit: "rings", value: 2 },
        { suit: "rings", value: 3 },
        { suit: "rings", value: 4 },
      ]);
      expect(MorgulKnife.objective.getStatus(game, seat)).toEqual({
        finality: "final",
        outcome: "success",
      });
    });

    test("returns { tentative, success } when only some rings are gone", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      const otherSeat = game.seats[1]!;
      // Add cards to hands so game is not finished
      for (const s of game.seats) {
        s.hand.addCard({ suit: "forests", value: s.seatIndex + 1 });
      }
      // Only some ring cards have been won
      addWonCards(otherSeat, [
        { suit: "rings", value: 1 },
        { suit: "rings", value: 2 },
      ]);
      expect(MorgulKnife.objective.getStatus(game, seat)).toEqual({
        finality: "tentative",
        outcome: "success",
      });
    });
  });

  describe("metadata", () => {
    test("has correct name", () => {
      expect(MorgulKnife.name).toBe("Morgul-Knife");
    });

    test("has correct objective text", () => {
      expect(MorgulKnife.objective.text).toBe("Do not lead with a ring card");
    });
  });
});
