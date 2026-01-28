import { describe, expect, test } from "bun:test";
import { FarmerMaggot } from "./farmer-maggot";
import { GameStateBuilder } from "../test-utils";

describe("Farmer Maggot", () => {
  describe("objective.getStatus", () => {
    test("returns { tentative, failure } when no threat card set", () => {
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Farmer Maggot")
        .build();

      seats[0]!.threatCard = null;
      expect(FarmerMaggot.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "tentative",
        outcome: "failure",
      });
    });

    test("returns { tentative, failure } when no cards won matching threat card", () => {
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Farmer Maggot")
        .seatWonCards(0, [{ suit: "mountains", value: 5 }])
        .build();

      seats[0]!.threatCard = 3;
      expect(FarmerMaggot.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "tentative",
        outcome: "failure",
      });
    });

    test("returns { tentative, failure } when only 1 card matches threat card", () => {
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Farmer Maggot")
        .seatWonCards(0, [
          { suit: "mountains", value: 3 },
          { suit: "shadows", value: 5 },
        ])
        .build();

      seats[0]!.threatCard = 3;
      expect(FarmerMaggot.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "tentative",
        outcome: "failure",
      });
    });

    test("returns { final, success } when exactly 2 cards match threat card", () => {
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Farmer Maggot")
        .seatWonCards(0, [
          { suit: "mountains", value: 3 },
          { suit: "shadows", value: 3 },
        ])
        .build();

      seats[0]!.threatCard = 3;
      expect(FarmerMaggot.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "final",
        outcome: "success",
      });
    });

    test("returns { final, success } when more than 2 cards match threat card", () => {
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Farmer Maggot")
        .seatWonCards(0, [
          { suit: "mountains", value: 4 },
          { suit: "shadows", value: 4 },
          { suit: "forests", value: 4 },
        ])
        .build();

      seats[0]!.threatCard = 4;
      expect(FarmerMaggot.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "final",
        outcome: "success",
      });
    });

    test("counts cards across multiple tricks", () => {
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Farmer Maggot")
        .seatWonCards(0, [
          { suit: "mountains", value: 5 },
          { suit: "shadows", value: 5 },
        ])
        .build();

      seats[0]!.threatCard = 5;
      expect(FarmerMaggot.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "final",
        outcome: "success",
      });
    });

    test("works with rings suit for low threat card values", () => {
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Farmer Maggot")
        .seatWonCards(0, [
          { suit: "rings", value: 3 },
          { suit: "mountains", value: 3 },
        ])
        .build();

      seats[0]!.threatCard = 3;
      expect(FarmerMaggot.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "final",
        outcome: "success",
      });
    });

    test("returns { final, failure } when others have won too many matching cards", () => {
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Farmer Maggot")
        .seatWonCards(1, [
          { suit: "mountains", value: 3 },
          { suit: "shadows", value: 3 },
          { suit: "forests", value: 3 },
          { suit: "hills", value: 3 },
        ])
        .build();

      // Other player wins 4 cards of value 3, only 1 remains (rings 3)
      // Maggot has 0 + only 1 available = 1, needs 2
      seats[0]!.threatCard = 3;
      expect(FarmerMaggot.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "final",
        outcome: "failure",
      });
    });

    test("returns { tentative, failure } when player has 1 and 1 more available", () => {
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Farmer Maggot")
        .seatWonCards(0, [{ suit: "mountains", value: 3 }])
        .seatWonCards(1, [
          { suit: "shadows", value: 3 },
          { suit: "forests", value: 3 },
          { suit: "hills", value: 3 },
        ])
        .build();

      // Maggot has 1 + 1 available (rings 3) = 2
      seats[0]!.threatCard = 3;
      expect(FarmerMaggot.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "tentative",
        outcome: "failure",
      });
    });

    test("accounts for rings only going up to 5", () => {
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Farmer Maggot")
        .seatWonCards(1, [
          { suit: "mountains", value: 7 },
          { suit: "shadows", value: 7 },
          { suit: "forests", value: 7 },
        ])
        .build();

      // Only 4 cards exist with value 7 (mountains, shadows, forests, hills)
      // Other player wins 3 of them
      // Maggot has 0 + 1 available = 1, needs 2
      seats[0]!.threatCard = 7;
      expect(FarmerMaggot.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "final",
        outcome: "failure",
      });
    });

    test("returns { tentative, failure } for high threat card when cards available", () => {
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Farmer Maggot")
        .build();

      // Only 4 cards of value 8 exist (no rings 8)
      seats[0]!.threatCard = 8;
      expect(FarmerMaggot.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "tentative",
        outcome: "failure",
      });
    });
  });

  describe("objective.getDetails", () => {
    test("returns undefined when no threat card", () => {
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Farmer Maggot")
        .build();

      seats[0]!.threatCard = null;
      const details = FarmerMaggot.objective.getDetails!(game, seats[0]!);
      expect(details).toBeUndefined();
    });

    test("shows threat card and count when threat card set", () => {
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Farmer Maggot")
        .build();

      seats[0]!.threatCard = 4;
      const details = FarmerMaggot.objective.getDetails!(game, seats[0]!);
      expect(details).toBe("Threat: 4, Won: 0/2");
    });

    test("shows correct count when cards won", () => {
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Farmer Maggot")
        .seatWonCards(0, [{ suit: "mountains", value: 5 }])
        .build();

      seats[0]!.threatCard = 5;
      const details = FarmerMaggot.objective.getDetails!(game, seats[0]!);
      expect(details).toBe("Threat: 5, Won: 1/2");
    });

    test("shows correct count when objective met", () => {
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Farmer Maggot")
        .seatWonCards(0, [
          { suit: "mountains", value: 3 },
          { suit: "shadows", value: 3 },
        ])
        .build();

      seats[0]!.threatCard = 3;
      const details = FarmerMaggot.objective.getDetails!(game, seats[0]!);
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
