import { describe, expect, test } from "bun:test";
import { GimliBurdened } from "./gimli";
import { GameStateBuilder } from "../../test-utils";

describe("Gimli (Burdened)", () => {
  describe("objective.getStatus", () => {
    test("returns { tentative, failure } when no threat card assigned", () => {
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Gimli (Burdened)")
        .build();

      expect(GimliBurdened.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "tentative",
        outcome: "failure",
      });
    });

    test("returns { tentative, failure } when threat card assigned but neither card won", () => {
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Gimli (Burdened)")
        .build();

      seats[0]!.threatCard = 5;

      expect(GimliBurdened.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "tentative",
        outcome: "failure",
      });
    });

    test("returns { tentative, failure } when only mountains card won", () => {
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Gimli (Burdened)")
        .seatWonCards(0, [{ suit: "mountains", value: 5 }])
        .build();

      seats[0]!.threatCard = 5;

      expect(GimliBurdened.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "tentative",
        outcome: "failure",
      });
    });

    test("returns { tentative, failure } when only shadows card won", () => {
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Gimli (Burdened)")
        .seatWonCards(0, [{ suit: "shadows", value: 5 }])
        .build();

      seats[0]!.threatCard = 5;

      expect(GimliBurdened.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "tentative",
        outcome: "failure",
      });
    });

    test("returns { final, success } when both mountains and shadows cards won", () => {
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Gimli (Burdened)")
        .seatWonCards(0, [
          { suit: "mountains", value: 5 },
          { suit: "shadows", value: 5 },
        ])
        .build();

      seats[0]!.threatCard = 5;

      expect(GimliBurdened.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "final",
        outcome: "success",
      });
    });

    test("returns { final, success } when both matching cards are among other cards", () => {
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Gimli (Burdened)")
        .seatWonCards(0, [
          { suit: "forests", value: 2 },
          { suit: "mountains", value: 3 },
          { suit: "shadows", value: 3 },
        ])
        .build();

      seats[0]!.threatCard = 3;

      expect(GimliBurdened.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "final",
        outcome: "success",
      });
    });

    test("returns { tentative, failure } when cards of wrong value won", () => {
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Gimli (Burdened)")
        .seatWonCards(0, [
          { suit: "mountains", value: 3 },
          { suit: "shadows", value: 3 },
        ])
        .build();

      seats[0]!.threatCard = 5;

      expect(GimliBurdened.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "tentative",
        outcome: "failure",
      });
    });

    test("returns { final, failure } when another player won the mountains card", () => {
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Gimli (Burdened)")
        .seatWonCards(1, [{ suit: "mountains", value: 5 }])
        .build();

      seats[0]!.threatCard = 5;

      expect(GimliBurdened.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "final",
        outcome: "failure",
      });
    });

    test("returns { final, failure } when another player won the shadows card", () => {
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Gimli (Burdened)")
        .seatWonCards(1, [{ suit: "shadows", value: 5 }])
        .build();

      seats[0]!.threatCard = 5;

      expect(GimliBurdened.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "final",
        outcome: "failure",
      });
    });

    test("returns { final, failure } when mountains card is the lost card", () => {
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Gimli (Burdened)")
        .withLostCard({ suit: "mountains", value: 5 })
        .build();

      seats[0]!.threatCard = 5;

      expect(GimliBurdened.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "final",
        outcome: "failure",
      });
    });

    test("returns { final, failure } when shadows card is the lost card", () => {
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Gimli (Burdened)")
        .withLostCard({ suit: "shadows", value: 5 })
        .build();

      seats[0]!.threatCard = 5;

      expect(GimliBurdened.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "final",
        outcome: "failure",
      });
    });
  });

  describe("metadata", () => {
    test("has correct name", () => {
      expect(GimliBurdened.name).toBe("Gimli (Burdened)");
    });

    test("has correct setupText", () => {
      expect(GimliBurdened.setupText).toBe(
        "Draw a threat card, then exchange with Legolas or Aragorn"
      );
    });

    test("has correct objective text", () => {
      expect(GimliBurdened.objective.text).toBe(
        "Win both the Mountains and Shadows cards matching your threat card"
      );
    });
  });
});
