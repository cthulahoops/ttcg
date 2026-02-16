import { describe, expect, test } from "bun:test";
import { FattyBolger } from "./fatty-bolger";
import { GameStateBuilder, TestController } from "../test-utils";
import { Game } from "../game";
import { Seat } from "../seat";
import { SolitaireHand } from "../hands";
import type { AnyCard } from "../types";
import type { SelectCardOptions } from "../controllers";

class ScriptedCardController extends TestController {
  async selectCard<T extends AnyCard>(
    cards: T[],
    _options: SelectCardOptions,
    _publicMessage: string
  ): Promise<T> {
    const first = cards[0];
    if (!first) {
      throw new Error("No cards available to select");
    }
    return first;
  }
}

describe("Fatty Bolger", () => {
  describe("setup", () => {
    test("gives a card to every other seat and adds one trick to play", async () => {
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Fatty Bolger")
        .build();

      seats[0]!.controller = new ScriptedCardController();

      const beforeSizes = seats.map((seat) => seat.hand.getSize());
      const beforeTricksToPlay = game.tricksToPlay;

      await FattyBolger.setup(game, seats[0]!, {
        frodoSeat: null,
        exchangeMade: false,
      });

      expect(seats[0]!.hand.getSize()).toBe(beforeSizes[0]! - 3);
      expect(seats[1]!.hand.getSize()).toBe(beforeSizes[1]! + 1);
      expect(seats[2]!.hand.getSize()).toBe(beforeSizes[2]! + 1);
      expect(seats[3]!.hand.getSize()).toBe(beforeSizes[3]! + 1);
      expect(game.tricksToPlay).toBe(beforeTricksToPlay + 1);
    });

    test("reveals hidden solo cards before giving cards in 1-player mode", async () => {
      const controller = new ScriptedCardController();

      const seats = [
        new Seat(
          0,
          controller,
          new SolitaireHand([
            { suit: "rings", value: 1 },
            { suit: "mountains", value: 2 },
            { suit: "shadows", value: 3 },
            { suit: "forests", value: 4 },
            { suit: "hills", value: 5 },
            { suit: "rings", value: 2 },
            { suit: "mountains", value: 3 },
          ]),
          false
        ),
        new Seat(
          1,
          new TestController(),
          new SolitaireHand([{ suit: "hills", value: 1 }]),
          false
        ),
        new Seat(
          2,
          new TestController(),
          new SolitaireHand([{ suit: "hills", value: 2 }]),
          false
        ),
        new Seat(
          3,
          new TestController(),
          new SolitaireHand([{ suit: "hills", value: 3 }]),
          false
        ),
      ];

      const game = new Game(1, 4, seats, { suit: "rings", value: 5 }, 0);
      seats[0]!.character = FattyBolger;

      const beforeVisibleCards = seats[0]!.hand.getAvailableCards().length;

      await FattyBolger.setup(game, seats[0]!, {
        frodoSeat: null,
        exchangeMade: false,
      });

      expect(beforeVisibleCards).toBe(4);
      expect(seats[0]!.hand.getAvailableCards().length).toBe(4);
    });
  });

  describe("objective.getStatus", () => {
    test("returns { tentative, failure } when no tricks won (game not finished)", () => {
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Fatty Bolger")
        .build();

      expect(FattyBolger.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "tentative",
        outcome: "failure",
      });
    });

    test("returns { tentative, success } when exactly 1 trick won (game not finished)", () => {
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Fatty Bolger")
        .seatWonCards(0, [{ suit: "mountains", value: 5 }])
        .build();

      expect(FattyBolger.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "tentative",
        outcome: "success",
      });
    });

    test("returns { final, success } when exactly 1 trick won (game finished)", () => {
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Fatty Bolger")
        .seatWonTricks(0, 1)
        .seatWonTricks(1, 3)
        .seatWonTricks(2, 3)
        .seatWonTricks(3, 2)
        .finishGame()
        .build();

      expect(game.finished).toBe(true);
      expect(seats[0]!.getTrickCount()).toBe(1);
      expect(FattyBolger.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "final",
        outcome: "success",
      });
    });

    test("returns { final, failure } when 2 tricks won", () => {
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Fatty Bolger")
        .seatWonCards(0, [
          { suit: "mountains", value: 2 },
          { suit: "shadows", value: 2 },
        ])
        .build();

      expect(FattyBolger.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "final",
        outcome: "failure",
      });
    });

    test("returns { final, failure } when more than 2 tricks won", () => {
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Fatty Bolger")
        .seatWonCards(0, [
          { suit: "mountains", value: 2 },
          { suit: "shadows", value: 2 },
          { suit: "forests", value: 3 },
        ])
        .build();

      expect(FattyBolger.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "final",
        outcome: "failure",
      });
    });

    test("returns { final, failure } when game finished but objective not met (no tricks)", () => {
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Fatty Bolger")
        .seatWonTricks(1, 3)
        .seatWonTricks(2, 3)
        .seatWonTricks(3, 3)
        .finishGame()
        .build();

      expect(game.finished).toBe(true);
      expect(seats[0]!.getTrickCount()).toBe(0);
      expect(FattyBolger.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "final",
        outcome: "failure",
      });
    });

    test("returns { final, failure } when hand is empty and no tricks won", () => {
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Fatty Bolger")
        .emptyHand(0)
        .build();

      expect(FattyBolger.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "final",
        outcome: "failure",
      });
    });

    test("returns { final, success } when exactly 1 trick won and hand is empty", () => {
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Fatty Bolger")
        .seatWonCards(0, [{ suit: "mountains", value: 5 }])
        .emptyHand(0)
        .build();

      expect(FattyBolger.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "final",
        outcome: "success",
      });
    });
  });

  describe("metadata", () => {
    test("has correct name", () => {
      expect(FattyBolger.name).toBe("Fatty Bolger");
    });

    test("has correct setupText", () => {
      expect(FattyBolger.setupText).toBe(
        "Give a card to every other character (don't take any back)"
      );
    });

    test("has correct objective text", () => {
      expect(FattyBolger.objective.text).toBe("Win exactly one trick");
    });
  });
});
