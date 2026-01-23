import { describe, expect, test } from "bun:test";
import { FarmerMaggot } from "./farmer-maggot";
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

describe("Farmer Maggot", () => {
  describe("objective.getStatus", () => {
    test("returns { tentative, failure } when no threat card set", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      seat.threatCard = null;
      expect(FarmerMaggot.objective.getStatus(game, seat)).toEqual({
        finality: "tentative",
        outcome: "failure",
      });
    });

    test("returns { tentative, failure } when no cards won matching threat card", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      // Add cards to hands so game is not finished
      for (const s of game.seats) {
        s.hand.addCard({ suit: "forests", value: s.seatIndex + 1 });
      }
      seat.threatCard = 3;
      addWonCards(seat, [{ suit: "mountains", value: 5 }]);
      expect(FarmerMaggot.objective.getStatus(game, seat)).toEqual({
        finality: "tentative",
        outcome: "failure",
      });
    });

    test("returns { tentative, failure } when only 1 card matches threat card", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      // Add cards to hands so game is not finished
      for (const s of game.seats) {
        s.hand.addCard({ suit: "forests", value: s.seatIndex + 1 });
      }
      seat.threatCard = 3;
      addWonCards(seat, [
        { suit: "mountains", value: 3 },
        { suit: "shadows", value: 5 },
      ]);
      expect(FarmerMaggot.objective.getStatus(game, seat)).toEqual({
        finality: "tentative",
        outcome: "failure",
      });
    });

    test("returns { final, success } when exactly 2 cards match threat card", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      seat.threatCard = 3;
      addWonCards(seat, [
        { suit: "mountains", value: 3 },
        { suit: "shadows", value: 3 },
      ]);
      expect(FarmerMaggot.objective.getStatus(game, seat)).toEqual({
        finality: "final",
        outcome: "success",
      });
    });

    test("returns { final, success } when more than 2 cards match threat card", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      seat.threatCard = 4;
      addWonCards(seat, [
        { suit: "mountains", value: 4 },
        { suit: "shadows", value: 4 },
        { suit: "forests", value: 4 },
      ]);
      expect(FarmerMaggot.objective.getStatus(game, seat)).toEqual({
        finality: "final",
        outcome: "success",
      });
    });

    test("counts cards across multiple tricks", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      seat.threatCard = 5;
      addWonCards(seat, [{ suit: "mountains", value: 5 }]);
      addWonCards(seat, [{ suit: "shadows", value: 5 }]);
      expect(FarmerMaggot.objective.getStatus(game, seat)).toEqual({
        finality: "final",
        outcome: "success",
      });
    });

    test("works with rings suit for low threat card values", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      seat.threatCard = 3;
      addWonCards(seat, [
        { suit: "rings", value: 3 },
        { suit: "mountains", value: 3 },
      ]);
      expect(FarmerMaggot.objective.getStatus(game, seat)).toEqual({
        finality: "final",
        outcome: "success",
      });
    });

    test("returns { final, failure } when others have won too many matching cards", () => {
      const game = createTestGame(4);
      const maggotSeat = game.seats[0]!;
      const otherSeat = game.seats[1]!;
      // Add cards to hands so game is not finished
      for (const s of game.seats) {
        s.hand.addCard({ suit: "forests", value: s.seatIndex + 1 });
      }
      maggotSeat.threatCard = 3;
      // Other player wins 4 cards of value 3, only 1 remains (rings 3)
      addWonCards(otherSeat, [
        { suit: "mountains", value: 3 },
        { suit: "shadows", value: 3 },
        { suit: "forests", value: 3 },
        { suit: "hills", value: 3 },
      ]);
      // Maggot has 0 + only 1 available = 1, needs 2
      expect(FarmerMaggot.objective.getStatus(game, maggotSeat)).toEqual({
        finality: "final",
        outcome: "failure",
      });
    });

    test("returns { tentative, failure } when player has 1 and 1 more available", () => {
      const game = createTestGame(4);
      const maggotSeat = game.seats[0]!;
      const otherSeat = game.seats[1]!;
      // Add cards to hands so game is not finished
      for (const s of game.seats) {
        s.hand.addCard({ suit: "forests", value: s.seatIndex + 1 });
      }
      maggotSeat.threatCard = 3;
      // Maggot has 1
      addWonCards(maggotSeat, [{ suit: "mountains", value: 3 }]);
      // Other has 3
      addWonCards(otherSeat, [
        { suit: "shadows", value: 3 },
        { suit: "forests", value: 3 },
        { suit: "hills", value: 3 },
      ]);
      // Maggot has 1 + 1 available (rings 3) = 2
      expect(FarmerMaggot.objective.getStatus(game, maggotSeat)).toEqual({
        finality: "tentative",
        outcome: "failure",
      });
    });

    test("accounts for rings only going up to 5", () => {
      const game = createTestGame(4);
      const maggotSeat = game.seats[0]!;
      const otherSeat = game.seats[1]!;
      // Add cards to hands so game is not finished
      for (const s of game.seats) {
        s.hand.addCard({ suit: "forests", value: s.seatIndex + 1 });
      }
      maggotSeat.threatCard = 7;
      // Only 4 cards exist with value 7 (mountains, shadows, forests, hills)
      // Other player wins 3 of them
      addWonCards(otherSeat, [
        { suit: "mountains", value: 7 },
        { suit: "shadows", value: 7 },
        { suit: "forests", value: 7 },
      ]);
      // Maggot has 0 + 1 available = 1, needs 2
      expect(FarmerMaggot.objective.getStatus(game, maggotSeat)).toEqual({
        finality: "final",
        outcome: "failure",
      });
    });

    test("returns { tentative, failure } for high threat card when cards available", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      // Add cards to hands so game is not finished
      for (const s of game.seats) {
        s.hand.addCard({ suit: "forests", value: s.seatIndex + 1 });
      }
      seat.threatCard = 8;
      // Only 4 cards of value 8 exist (no rings 8)
      expect(FarmerMaggot.objective.getStatus(game, seat)).toEqual({
        finality: "tentative",
        outcome: "failure",
      });
    });
  });

  describe("objective.getDetails", () => {
    test("returns undefined when no threat card", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      seat.threatCard = null;
      const details = FarmerMaggot.objective.getDetails!(game, seat);
      expect(details).toBeUndefined();
    });

    test("shows threat card and count when threat card set", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      seat.threatCard = 4;
      const details = FarmerMaggot.objective.getDetails!(game, seat);
      expect(details).toBe("Threat: 4, Won: 0/2");
    });

    test("shows correct count when cards won", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      seat.threatCard = 5;
      addWonCards(seat, [{ suit: "mountains", value: 5 }]);
      const details = FarmerMaggot.objective.getDetails!(game, seat);
      expect(details).toBe("Threat: 5, Won: 1/2");
    });

    test("shows correct count when objective met", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      seat.threatCard = 3;
      addWonCards(seat, [
        { suit: "mountains", value: 3 },
        { suit: "shadows", value: 3 },
      ]);
      const details = FarmerMaggot.objective.getDetails!(game, seat);
      expect(details).toBe("Threat: 3, Won: 2/2");
    });
  });

  describe("metadata", () => {
    test("has correct name", () => {
      expect(FarmerMaggot.name).toBe("Farmer Maggot");
    });

    test("has correct setupText", () => {
      expect(FarmerMaggot.setupText).toBe(
        "Draw a threat card, then exchange with Merry or Pippin"
      );
    });

    test("has correct objective text", () => {
      expect(FarmerMaggot.objective.text).toBe(
        "Win at least two cards matching the threat card rank"
      );
    });
  });
});
