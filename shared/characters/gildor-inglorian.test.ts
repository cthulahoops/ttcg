import { describe, expect, test } from "bun:test";
import { GildorInglorian } from "./gildor-inglorian";
import { GameStateBuilder } from "../test-utils";

describe("GildorInglorian", () => {
  describe("objective.getStatus", () => {
    test("returns { final, failure } when game is not finished and no forests in hand", () => {
      const { game, seats } = new GameStateBuilder(4).build();
      const seat = seats[0]!;
      // Clear hand and add only non-forests cards
      const cards = seat.hand.getAvailableCards() ?? [];
      for (const card of cards) {
        seat.hand.removeCard(card);
      }
      for (const s of seats) {
        s.hand.addCard({ suit: "mountains", value: s.seatIndex + 1 });
      }
      expect(GildorInglorian.objective.getStatus(game, seat)).toEqual({
        finality: "final",
        outcome: "failure",
      });
    });

    test("returns { tentative, failure } when game is not finished and has forests in hand", () => {
      const { game, seats } = new GameStateBuilder(4).build();
      const seat = seats[0]!;
      seat.hand.addCard({ suit: "forests", value: 3 });
      expect(GildorInglorian.objective.getStatus(game, seat)).toEqual({
        finality: "tentative",
        outcome: "failure",
      });
    });

    test("returns { final, failure } when no cards have been played (game finished)", () => {
      const { game, seats } = new GameStateBuilder(4).finishGame().build();
      const seat = seats[0]!;
      expect(GildorInglorian.objective.getStatus(game, seat)).toEqual({
        finality: "final",
        outcome: "failure",
      });
    });

    test("returns { final, failure } when last played card is not forests (game finished)", () => {
      const { game, seats } = new GameStateBuilder(4).finishGame().build();
      const seat = seats[0]!;
      seat.playedCards.push({ suit: "forests", value: 3 });
      seat.playedCards.push({ suit: "mountains", value: 5 });
      expect(GildorInglorian.objective.getStatus(game, seat)).toEqual({
        finality: "final",
        outcome: "failure",
      });
    });

    test("returns { final, success } when last played card is forests (game finished)", () => {
      const { game, seats } = new GameStateBuilder(4).finishGame().build();
      const seat = seats[0]!;
      seat.playedCards.push({ suit: "mountains", value: 3 });
      seat.playedCards.push({ suit: "forests", value: 5 });
      expect(GildorInglorian.objective.getStatus(game, seat)).toEqual({
        finality: "final",
        outcome: "success",
      });
    });

    test("only checks the last card regardless of other forests cards played", () => {
      const { game, seats } = new GameStateBuilder(4).finishGame().build();
      const seat = seats[0]!;
      seat.playedCards.push({ suit: "forests", value: 1 });
      seat.playedCards.push({ suit: "forests", value: 2 });
      seat.playedCards.push({ suit: "hills", value: 3 });
      expect(GildorInglorian.objective.getStatus(game, seat)).toEqual({
        finality: "final",
        outcome: "failure",
      });
    });

    test("works with various forests card values", () => {
      const { game, seats } = new GameStateBuilder(4).finishGame().build();
      const seat = seats[0]!;
      seat.playedCards.push({ suit: "forests", value: 8 });
      expect(GildorInglorian.objective.getStatus(game, seat)).toEqual({
        finality: "final",
        outcome: "success",
      });
    });

    test("returns { tentative, failure } when player has forests cards in hand (game not finished)", () => {
      const { game, seats } = new GameStateBuilder(4).build();
      const seat = seats[0]!;
      // Add forests card to seat 0
      seat.hand.addCard({ suit: "forests", value: 3 });
      expect(GildorInglorian.objective.getStatus(game, seat)).toEqual({
        finality: "tentative",
        outcome: "failure",
      });
    });

    test("returns { final, failure } when player has no forests cards in hand (game not finished)", () => {
      const { game, seats } = new GameStateBuilder(4).build();
      const seat = seats[0]!;
      // Clear hand and give all players non-forests cards
      for (const s of seats) {
        const cards = s.hand.getAvailableCards() ?? [];
        for (const card of cards) {
          s.hand.removeCard(card);
        }
        s.hand.addCard({ suit: "mountains", value: s.seatIndex + 1 });
      }
      expect(GildorInglorian.objective.getStatus(game, seat)).toEqual({
        finality: "final",
        outcome: "failure",
      });
    });

    test("returns { tentative, failure } with only forests cards in hand (game not finished)", () => {
      const { game, seats } = new GameStateBuilder(4).build();
      const seat = seats[0]!;
      // Clear all hands
      for (const s of seats) {
        const cards = s.hand.getAvailableCards() ?? [];
        for (const card of cards) {
          s.hand.removeCard(card);
        }
      }
      // Give other players cards
      for (const s of seats) {
        if (s.seatIndex !== 0) {
          s.hand.addCard({ suit: "mountains", value: s.seatIndex + 1 });
        }
      }
      // Give seat 0 only forests cards
      seat.hand.addCard({ suit: "forests", value: 1 });
      seat.hand.addCard({ suit: "forests", value: 8 });
      expect(GildorInglorian.objective.getStatus(game, seat)).toEqual({
        finality: "tentative",
        outcome: "failure",
      });
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
