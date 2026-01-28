import { describe, expect, test } from "bun:test";
import { Gimli } from "./gimli";
import { GameStateBuilder } from "../test-utils";

describe("Gimli", () => {
  describe("objective.getStatus", () => {
    test("returns { tentative, failure } when no threat card assigned", () => {
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Gimli")
        .build();

      expect(Gimli.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "tentative",
        outcome: "failure",
      });
    });

    test("returns { tentative, failure } when threat card assigned but not won", () => {
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Gimli")
        .build();

      seats[0]!.threatCard = 5;
      expect(Gimli.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "tentative",
        outcome: "failure",
      });
    });

    test("returns { tentative, failure } when different mountains card won", () => {
      // Use withLostCard to keep mountains-5 out of any tricks while still
      // being counted as potentially winnable by the objective logic
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Gimli")
        .withLostCard({ suit: "mountains", value: 5 })
        .seatWonCards(0, [{ suit: "mountains", value: 3 }])
        .build();

      seats[0]!.threatCard = 5;
      expect(Gimli.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "tentative",
        outcome: "failure",
      });
    });

    test("returns { final, success } when matching mountains card won", () => {
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Gimli")
        .seatWonCards(0, [{ suit: "mountains", value: 5 }])
        .build();

      seats[0]!.threatCard = 5;
      expect(Gimli.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "final",
        outcome: "success",
      });
    });

    test("returns { final, success } when matching mountains card is among other cards", () => {
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Gimli")
        .seatWonCards(0, [
          { suit: "forests", value: 1 },
          { suit: "mountains", value: 3 },
          { suit: "shadows", value: 7 },
        ])
        .build();

      seats[0]!.threatCard = 3;
      expect(Gimli.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "final",
        outcome: "success",
      });
    });

    test("ignores non-mountains cards with matching value", () => {
      // Use withLostCard to keep mountains-5 out of any tricks while still
      // being counted as potentially winnable by the objective logic
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Gimli")
        .withLostCard({ suit: "mountains", value: 5 })
        .seatWonCards(0, [
          { suit: "forests", value: 5 },
          { suit: "shadows", value: 5 },
          { suit: "hills", value: 5 },
        ])
        .build();

      seats[0]!.threatCard = 5;
      expect(Gimli.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "tentative",
        outcome: "failure",
      });
    });

    test("returns { final, failure } when another player has won the threat card", () => {
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Gimli")
        .seatWonCards(1, [{ suit: "mountains", value: 5 }])
        .build();

      seats[0]!.threatCard = 5;
      expect(Gimli.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "final",
        outcome: "failure",
      });
    });

    test("returns { tentative, failure } when another player won a different mountains card", () => {
      // Use withLostCard to keep mountains-5 out of any tricks while still
      // being counted as potentially winnable by the objective logic
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Gimli")
        .withLostCard({ suit: "mountains", value: 5 })
        .seatWonCards(1, [{ suit: "mountains", value: 3 }])
        .build();

      seats[0]!.threatCard = 5;
      expect(Gimli.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "tentative",
        outcome: "failure",
      });
    });
  });

  describe("metadata", () => {
    test("has correct name", () => {
      expect(Gimli.name).toBe("Gimli");
    });

    test("has correct setupText", () => {
      expect(Gimli.setupText).toBe(
        "Draw a Mountains threat card, then exchange with Legolas or Aragorn"
      );
    });

    test("has correct objective text", () => {
      expect(Gimli.objective.text).toBe(
        "Win the Mountains card matching your threat card"
      );
    });
  });
});
