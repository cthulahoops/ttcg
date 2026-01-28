import { describe, expect, test } from "bun:test";
import { Boromir } from "./boromir";
import { GameStateBuilder } from "../test-utils";

describe("Boromir", () => {
  describe("objective.getStatus", () => {
    test("returns { tentative, failure } when no tricks have been played (game not finished)", () => {
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Boromir")
        .build();

      expect(Boromir.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "tentative",
        outcome: "failure",
      });
    });

    test("returns { tentative, failure } when Boromir did not win the last trick", () => {
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Boromir")
        .build();

      game.lastTrickWinner = 1; // Someone else won
      expect(Boromir.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "tentative",
        outcome: "failure",
      });
    });

    test("returns { final, failure } when Boromir has 1 of Rings", () => {
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Boromir")
        .seatWonCards(0, [{ suit: "rings", value: 1 }])
        .build();

      game.lastTrickWinner = 0;
      expect(Boromir.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "final",
        outcome: "failure",
      });
    });

    test("returns { tentative, success } when Boromir won the last trick without 1 of Rings (game not finished)", () => {
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Boromir")
        .build();

      game.lastTrickWinner = 0;
      expect(Boromir.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "tentative",
        outcome: "success",
      });
    });

    test("returns { final, success } when Boromir won the last trick without 1 of Rings (game finished)", () => {
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Boromir")
        .finishGame()
        .build();

      game.lastTrickWinner = 0;
      expect(game.finished).toBe(true);
      expect(Boromir.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "final",
        outcome: "success",
      });
    });

    test("returns { tentative, success } when Boromir won the last trick with other rings cards", () => {
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Boromir")
        .seatWonCards(0, [
          { suit: "rings", value: 2 },
          { suit: "rings", value: 3 },
          { suit: "rings", value: 5 },
        ])
        .build();

      game.lastTrickWinner = 0;
      expect(Boromir.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "tentative",
        outcome: "success",
      });
    });

    test("works correctly for different seat indices", () => {
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(2, "Boromir")
        .build();

      game.lastTrickWinner = 2;
      expect(Boromir.objective.getStatus(game, seats[2]!)).toEqual({
        finality: "tentative",
        outcome: "success",
      });
    });

    test("returns { final, failure } when game finished but Boromir did not win last trick", () => {
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Boromir")
        .finishGame()
        .build();

      game.lastTrickWinner = 1;
      expect(game.finished).toBe(true);
      expect(Boromir.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "final",
        outcome: "failure",
      });
    });
  });

  describe("objective.getDetails", () => {
    test("shows correct details with last trick status", () => {
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Boromir")
        .build();

      game.lastTrickWinner = 0;
      const details = Boromir.objective.getDetails!(game, seats[0]!);
      expect(details).toContain("Last: yes");
      expect(details).toContain("1-Ring: ok");
    });

    test("shows correct details when has 1 of Rings", () => {
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Boromir")
        .seatWonCards(0, [{ suit: "rings", value: 1 }])
        .build();

      game.lastTrickWinner = 0;
      const details = Boromir.objective.getDetails!(game, seats[0]!);
      expect(details).toContain("Last: yes");
      expect(details).toContain("has 1-Ring");
    });

    test("shows correct details when not winning last trick", () => {
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Boromir")
        .build();

      game.lastTrickWinner = 1;
      const details = Boromir.objective.getDetails!(game, seats[0]!);
      expect(details).toContain("Last: no");
    });
  });

  describe("metadata", () => {
    test("has correct name", () => {
      expect(Boromir.name).toBe("Boromir");
    });

    test("has correct setupText", () => {
      expect(Boromir.setupText).toBe("Exchange with anyone except Frodo");
    });

    test("has correct objective text", () => {
      expect(Boromir.objective.text).toBe(
        "Win the last trick; do NOT win the 1 of Rings"
      );
    });
  });
});
