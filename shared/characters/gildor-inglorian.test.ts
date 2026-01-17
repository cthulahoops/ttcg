import { describe, expect, test } from "bun:test";
import { GildorInglorian } from "./gildor-inglorian";
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

// Test helper: make game not finished by adding cards to multiple hands
function makeGameNotFinished(game: Game): void {
  // Game is finished when (numCharacters - 1) players have empty hands
  // So we need at least 2 players with cards to be "not finished" in a 4-player game
  for (const seat of game.seats) {
    seat.hand.addCard({ suit: "mountains", value: seat.seatIndex + 1 });
  }
}

// Test helper: mark game as finished by emptying all hands
function finishGame(game: Game): void {
  for (const seat of game.seats) {
    const cards = seat.hand.getAvailableCards() ?? [];
    for (const card of cards) {
      seat.hand.removeCard(card);
    }
  }
}

describe("GildorInglorian", () => {
  describe("objective.check", () => {
    test("returns false when game is not finished", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      // Add a forests card as last played card
      seat.playedCards.push({ suit: "forests", value: 5 });
      // Make game not finished by giving all players cards
      makeGameNotFinished(game);
      expect(GildorInglorian.objective.check(game, seat)).toBe(false);
    });

    test("returns false when no cards have been played", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      finishGame(game);
      expect(GildorInglorian.objective.check(game, seat)).toBe(false);
    });

    test("returns false when last played card is not forests", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      seat.playedCards.push({ suit: "forests", value: 3 });
      seat.playedCards.push({ suit: "mountains", value: 5 });
      finishGame(game);
      expect(GildorInglorian.objective.check(game, seat)).toBe(false);
    });

    test("returns true when last played card is forests and game is finished", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      seat.playedCards.push({ suit: "mountains", value: 3 });
      seat.playedCards.push({ suit: "forests", value: 5 });
      finishGame(game);
      expect(GildorInglorian.objective.check(game, seat)).toBe(true);
    });

    test("only checks the last card regardless of other forests cards played", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      seat.playedCards.push({ suit: "forests", value: 1 });
      seat.playedCards.push({ suit: "forests", value: 2 });
      seat.playedCards.push({ suit: "hills", value: 3 });
      finishGame(game);
      expect(GildorInglorian.objective.check(game, seat)).toBe(false);
    });

    test("works with various forests card values", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      seat.playedCards.push({ suit: "forests", value: 8 });
      finishGame(game);
      expect(GildorInglorian.objective.check(game, seat)).toBe(true);
    });
  });

  describe("objective.isCompletable", () => {
    test("returns check result when game is finished and objective met", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      seat.playedCards.push({ suit: "forests", value: 5 });
      finishGame(game);
      expect(GildorInglorian.objective.isCompletable(game, seat)).toBe(true);
    });

    test("returns false when game is finished and objective not met", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      seat.playedCards.push({ suit: "mountains", value: 5 });
      finishGame(game);
      expect(GildorInglorian.objective.isCompletable(game, seat)).toBe(false);
    });

    test("returns true when player has forests cards in hand (game not finished)", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      // Give all players cards so game is not finished
      makeGameNotFinished(game);
      // Now add forests card to seat 0
      seat.hand.addCard({ suit: "forests", value: 3 });
      expect(GildorInglorian.objective.isCompletable(game, seat)).toBe(true);
    });

    test("returns false when player has no forests cards in hand (game not finished)", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      // Give all players non-forests cards
      for (const s of game.seats) {
        s.hand.addCard({ suit: "mountains", value: s.seatIndex + 1 });
      }
      expect(GildorInglorian.objective.isCompletable(game, seat)).toBe(false);
    });

    test("returns true with only forests cards in hand (game not finished)", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      // Give other players cards
      for (const s of game.seats) {
        if (s.seatIndex !== 0) {
          s.hand.addCard({ suit: "mountains", value: s.seatIndex + 1 });
        }
      }
      // Give seat 0 only forests cards
      seat.hand.addCard({ suit: "forests", value: 1 });
      seat.hand.addCard({ suit: "forests", value: 8 });
      expect(GildorInglorian.objective.isCompletable(game, seat)).toBe(true);
    });
  });

  describe("objective.isCompleted", () => {
    test("returns false when game is not finished", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      seat.playedCards.push({ suit: "forests", value: 5 });
      makeGameNotFinished(game);
      expect(GildorInglorian.objective.isCompleted(game, seat)).toBe(false);
    });

    test("returns false when game is finished but check fails", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      seat.playedCards.push({ suit: "mountains", value: 5 });
      finishGame(game);
      expect(GildorInglorian.objective.isCompleted(game, seat)).toBe(false);
    });

    test("returns true when game is finished and check passes", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      seat.playedCards.push({ suit: "forests", value: 5 });
      finishGame(game);
      expect(GildorInglorian.objective.isCompleted(game, seat)).toBe(true);
    });
  });

  describe("display.renderStatus", () => {
    test("returns correct status flags when objective not met (game not finished)", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      // Give all players non-forests cards so game is not finished
      for (const s of game.seats) {
        s.hand.addCard({ suit: "mountains", value: s.seatIndex + 1 });
      }
      const status = GildorInglorian.display.renderStatus(game, seat);
      expect(status.met).toBe(false);
      expect(status.completable).toBe(false);
      expect(status.completed).toBe(false);
    });

    test("returns completable=true when player has forests in hand (game not finished)", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      makeGameNotFinished(game);
      seat.hand.addCard({ suit: "forests", value: 3 });
      const status = GildorInglorian.display.renderStatus(game, seat);
      expect(status.met).toBe(false);
      expect(status.completable).toBe(true);
      expect(status.completed).toBe(false);
    });

    test("returns all true when objective is completed", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      seat.playedCards.push({ suit: "forests", value: 5 });
      finishGame(game);
      const status = GildorInglorian.display.renderStatus(game, seat);
      expect(status.met).toBe(true);
      expect(status.completable).toBe(true);
      expect(status.completed).toBe(true);
    });
  });

  describe("metadata", () => {
    test("has correct name", () => {
      expect(GildorInglorian.name).toBe("Gildor Inglorian");
    });

    test("has correct setupText", () => {
      expect(GildorInglorian.setupText).toBe("Exchange with Frodo");
    });

    test("has correct objective text", () => {
      expect(GildorInglorian.objective.text).toBe(
        "Play a forests card in final trick"
      );
    });
  });
});
