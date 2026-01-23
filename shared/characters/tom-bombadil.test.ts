import { describe, expect, test } from "bun:test";
import { TomBombadil } from "./tom-bombadil";
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

// Test helper: add won cards to a seat (simulates winning a trick)
function addWonCards(seat: Seat, cards: Card[]): void {
  seat.addTrick(seat.tricksWon.length, cards);
}

// Helper to make game not finished by adding cards to multiple seats
function makeGameNotFinished(game: Game): void {
  // Game is finished when (numCharacters - 1) have empty hands
  // So we need at least 2 players with cards to be not finished
  for (const s of game.seats) {
    s.hand.addCard({ suit: "shadows", value: s.seatIndex + 1 });
  }
}

describe("Tom Bombadil", () => {
  describe("objective.getStatus", () => {
    test("returns { final, failure } when no cards in hand (game finished)", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      // No cards in hand, no cards won
      expect(game.finished).toBe(true);
      expect(TomBombadil.objective.getStatus(game, seat)).toEqual({
        finality: "final",
        outcome: "failure",
      });
    });

    test("returns { tentative, failure } when cards in hand but no cards won", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      makeGameNotFinished(game);
      seat.hand.addCard({ suit: "forests", value: 3 });
      expect(TomBombadil.objective.getStatus(game, seat)).toEqual({
        finality: "tentative",
        outcome: "failure",
      });
    });

    test("returns { tentative, failure } when won cards don't match suit in hand", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      makeGameNotFinished(game);
      seat.hand.addCard({ suit: "forests", value: 3 });
      addWonCards(seat, [
        { suit: "mountains", value: 1 },
        { suit: "mountains", value: 2 },
        { suit: "mountains", value: 3 },
      ]);
      expect(TomBombadil.objective.getStatus(game, seat)).toEqual({
        finality: "tentative",
        outcome: "failure",
      });
    });

    test("returns { tentative, failure } when only 2 cards of matching suit won", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      makeGameNotFinished(game);
      seat.hand.addCard({ suit: "forests", value: 3 });
      addWonCards(seat, [
        { suit: "forests", value: 1 },
        { suit: "forests", value: 2 },
      ]);
      expect(TomBombadil.objective.getStatus(game, seat)).toEqual({
        finality: "tentative",
        outcome: "failure",
      });
    });

    test("returns { tentative, success } when exactly 3 cards of matching suit won (game not finished)", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      makeGameNotFinished(game);
      seat.hand.addCard({ suit: "forests", value: 3 });
      addWonCards(seat, [
        { suit: "forests", value: 1 },
        { suit: "forests", value: 2 },
        { suit: "forests", value: 4 },
      ]);
      expect(TomBombadil.objective.getStatus(game, seat)).toEqual({
        finality: "tentative",
        outcome: "success",
      });
    });

    test("returns { final, success } when exactly 3 cards of matching suit won (game finished)", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      // Game finished when (numCharacters - 1) = 3 have no cards
      // So only Tom can have cards for game to be finished
      seat.hand.addCard({ suit: "forests", value: 8 });
      addWonCards(seat, [
        { suit: "forests", value: 1 },
        { suit: "forests", value: 2 },
        { suit: "forests", value: 3 },
      ]);
      // Only seat 0 has cards, so game IS finished
      expect(game.finished).toBe(true);
      expect(TomBombadil.objective.getStatus(game, seat)).toEqual({
        finality: "final",
        outcome: "success",
      });
    });

    test("returns { tentative, success } when more than 3 cards of matching suit won", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      makeGameNotFinished(game);
      seat.hand.addCard({ suit: "hills", value: 5 });
      addWonCards(seat, [
        { suit: "hills", value: 1 },
        { suit: "hills", value: 2 },
        { suit: "hills", value: 3 },
        { suit: "hills", value: 4 },
      ]);
      expect(TomBombadil.objective.getStatus(game, seat)).toEqual({
        finality: "tentative",
        outcome: "success",
      });
    });

    test("returns { tentative, success } when any card in hand matches won suit", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      makeGameNotFinished(game);
      // Multiple cards in hand, only one matches the won suit
      seat.hand.addCard({ suit: "mountains", value: 1 });
      seat.hand.addCard({ suit: "forests", value: 2 });
      addWonCards(seat, [
        { suit: "forests", value: 3 },
        { suit: "forests", value: 4 },
        { suit: "forests", value: 5 },
      ]);
      expect(TomBombadil.objective.getStatus(game, seat)).toEqual({
        finality: "tentative",
        outcome: "success",
      });
    });

    test("counts cards across multiple tricks", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      makeGameNotFinished(game);
      seat.hand.addCard({ suit: "shadows", value: 8 });
      addWonCards(seat, [{ suit: "shadows", value: 1 }]);
      addWonCards(seat, [{ suit: "shadows", value: 2 }]);
      addWonCards(seat, [{ suit: "shadows", value: 3 }]);
      expect(TomBombadil.objective.getStatus(game, seat)).toEqual({
        finality: "tentative",
        outcome: "success",
      });
    });

    test("works with rings suit", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      makeGameNotFinished(game);
      seat.hand.addCard({ suit: "rings", value: 5 });
      addWonCards(seat, [
        { suit: "rings", value: 1 },
        { suit: "rings", value: 2 },
        { suit: "rings", value: 3 },
      ]);
      expect(TomBombadil.objective.getStatus(game, seat)).toEqual({
        finality: "tentative",
        outcome: "success",
      });
    });

    test("returns { final, failure } when others have won too many cards of suits in hand", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      const otherSeat = game.seats[1]!;
      makeGameNotFinished(game);
      // Clear seat's hand and add only a forests card
      seat.hand.removeCard(seat.hand.getAvailableCards()[0]!);
      seat.hand.addCard({ suit: "forests", value: 8 });
      // Other player has won 6 forests (only 2 remain, Tom needs 3)
      addWonCards(otherSeat, [
        { suit: "forests", value: 1 },
        { suit: "forests", value: 2 },
        { suit: "forests", value: 3 },
        { suit: "forests", value: 4 },
        { suit: "forests", value: 5 },
        { suit: "forests", value: 6 },
      ]);
      expect(TomBombadil.objective.getStatus(game, seat)).toEqual({
        finality: "final",
        outcome: "failure",
      });
    });

    test("considers all suits in hand when checking completability", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      const otherSeat = game.seats[1]!;
      makeGameNotFinished(game);
      // Tom has both forests and mountains in hand
      seat.hand.addCard({ suit: "forests", value: 8 });
      seat.hand.addCard({ suit: "mountains", value: 7 });
      // Other player has won most forests but mountains are available
      addWonCards(otherSeat, [
        { suit: "forests", value: 1 },
        { suit: "forests", value: 2 },
        { suit: "forests", value: 3 },
        { suit: "forests", value: 4 },
        { suit: "forests", value: 5 },
        { suit: "forests", value: 6 },
      ]);
      // Still completable via mountains
      expect(TomBombadil.objective.getStatus(game, seat)).toEqual({
        finality: "tentative",
        outcome: "failure",
      });
    });

    test("returns { tentative, failure } when Tom has won some cards toward goal", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      makeGameNotFinished(game);
      seat.hand.addCard({ suit: "hills", value: 8 });
      addWonCards(seat, [
        { suit: "hills", value: 1 },
        { suit: "hills", value: 2 },
      ]);
      // Tom has 2 hills, needs 1 more, plenty available
      expect(TomBombadil.objective.getStatus(game, seat)).toEqual({
        finality: "tentative",
        outcome: "failure",
      });
    });

    test("returns { final, failure } when game finished but no cards in hand", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      // No cards in hand, game is finished
      addWonCards(seat, [
        { suit: "forests", value: 1 },
        { suit: "forests", value: 2 },
        { suit: "forests", value: 3 },
      ]);
      expect(game.finished).toBe(true);
      expect(TomBombadil.objective.getStatus(game, seat)).toEqual({
        finality: "final",
        outcome: "failure",
      });
    });
  });

  describe("objective.getDetails", () => {
    test("shows suit counts >= 2", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      seat.hand.addCard({ suit: "forests", value: 8 });
      addWonCards(seat, [
        { suit: "forests", value: 1 },
        { suit: "forests", value: 2 },
        { suit: "mountains", value: 1 },
      ]);
      const details = TomBombadil.objective.getDetails!(game, seat);
      expect(details).toContain(":2");
    });

    test("shows multiple suits in details when both >= 2", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      seat.hand.addCard({ suit: "forests", value: 8 });
      addWonCards(seat, [
        { suit: "forests", value: 1 },
        { suit: "forests", value: 2 },
        { suit: "mountains", value: 1 },
        { suit: "mountains", value: 2 },
      ]);
      const details = TomBombadil.objective.getDetails!(game, seat);
      expect(details).toContain(":2");
    });

    test("returns undefined when no suit has >= 2 cards", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      seat.hand.addCard({ suit: "forests", value: 8 });
      addWonCards(seat, [
        { suit: "forests", value: 1 },
        { suit: "mountains", value: 1 },
      ]);
      const details = TomBombadil.objective.getDetails!(game, seat);
      expect(details).toBeUndefined();
    });
  });

  describe("metadata", () => {
    test("has correct name", () => {
      expect(TomBombadil.name).toBe("Tom Bombadil");
    });

    test("has correct setupText", () => {
      expect(TomBombadil.setupText).toBe(
        "Take the lost card, then exchange with Frodo"
      );
    });

    test("has correct objective text", () => {
      expect(TomBombadil.objective.text).toBe(
        "Win 3 or more cards matching the suit of a card left in hand at the end of round"
      );
    });
  });
});
