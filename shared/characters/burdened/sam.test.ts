import { describe, expect, test } from "bun:test";
import { SamBurdened } from "./sam";
import { GameStateBuilder } from "../../test-utils";

describe("Sam (Burdened)", () => {
  describe("objective.getStatus", () => {
    test("returns { tentative, failure } when no threat card assigned", () => {
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Sam (Burdened)")
        .build();

      expect(SamBurdened.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "tentative",
        outcome: "failure",
      });
    });

    test("returns { tentative, failure } when threat card assigned but neither card won", () => {
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Sam (Burdened)")
        .build();

      seats[0]!.threatCard = 5;

      expect(SamBurdened.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "tentative",
        outcome: "failure",
      });
    });

    test("returns { tentative, failure } when only hills card won", () => {
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Sam (Burdened)")
        .seatWonCards(0, [{ suit: "hills", value: 5 }])
        .build();

      seats[0]!.threatCard = 5;

      expect(SamBurdened.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "tentative",
        outcome: "failure",
      });
    });

    test("returns { tentative, failure } when only shadows card won", () => {
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Sam (Burdened)")
        .seatWonCards(0, [{ suit: "shadows", value: 5 }])
        .build();

      seats[0]!.threatCard = 5;

      expect(SamBurdened.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "tentative",
        outcome: "failure",
      });
    });

    test("returns { final, success } when both hills and shadows cards won", () => {
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Sam (Burdened)")
        .seatWonCards(0, [
          { suit: "hills", value: 5 },
          { suit: "shadows", value: 5 },
        ])
        .build();

      seats[0]!.threatCard = 5;

      expect(SamBurdened.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "final",
        outcome: "success",
      });
    });

    test("returns { final, success } when both matching cards are among other cards", () => {
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Sam (Burdened)")
        .seatWonCards(0, [
          { suit: "mountains", value: 2 },
          { suit: "hills", value: 3 },
          { suit: "shadows", value: 3 },
        ])
        .build();

      seats[0]!.threatCard = 3;

      expect(SamBurdened.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "final",
        outcome: "success",
      });
    });

    test("returns { tentative, failure } when cards of wrong value won", () => {
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Sam (Burdened)")
        .seatWonCards(0, [
          { suit: "hills", value: 3 },
          { suit: "shadows", value: 3 },
        ])
        .build();

      seats[0]!.threatCard = 5;

      expect(SamBurdened.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "tentative",
        outcome: "failure",
      });
    });

    test("returns { final, failure } when another player won the hills card", () => {
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Sam (Burdened)")
        .seatWonCards(1, [{ suit: "hills", value: 5 }])
        .build();

      seats[0]!.threatCard = 5;

      expect(SamBurdened.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "final",
        outcome: "failure",
      });
    });

    test("returns { final, failure } when another player won the shadows card", () => {
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Sam (Burdened)")
        .seatWonCards(1, [{ suit: "shadows", value: 5 }])
        .build();

      seats[0]!.threatCard = 5;

      expect(SamBurdened.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "final",
        outcome: "failure",
      });
    });

    test("returns { final, failure } when hills card is the lost card", () => {
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Sam (Burdened)")
        .withLostCard({ suit: "hills", value: 5 })
        .build();

      seats[0]!.threatCard = 5;

      expect(SamBurdened.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "final",
        outcome: "failure",
      });
    });

    test("returns { final, failure } when shadows card is the lost card", () => {
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Sam (Burdened)")
        .withLostCard({ suit: "shadows", value: 5 })
        .build();

      seats[0]!.threatCard = 5;

      expect(SamBurdened.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "final",
        outcome: "failure",
      });
    });
  });

  describe("metadata", () => {
    test("has correct name", () => {
      expect(SamBurdened.name).toBe("Sam (Burdened)");
    });

    test("has correct setupText", () => {
      expect(SamBurdened.setupText).toBe("Draw a threat card (no exchange)");
    });

    test("has correct objective text", () => {
      expect(SamBurdened.objective.text).toBe(
        "Win both the Hills and Shadows cards matching your threat card. Your Rings cards count toward Frodo's objective."
      );
    });
  });
});
