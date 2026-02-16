import { describe, expect, test } from "bun:test";
import { Game } from "./game";
import { Seat } from "./seat";
import { PlayerHand, PyramidHand } from "./hands";
import { TestController } from "./test-utils";
import type { AnyCard } from "./types";
import type { SelectCardOptions } from "./controllers";

class FirstCardController extends TestController {
  async selectCard<T extends AnyCard>(
    cards: T[],
    _options: SelectCardOptions,
    _publicMessage: string
  ): Promise<T> {
    const first = cards[0];
    if (!first) {
      throw new Error("No cards available");
    }
    return first;
  }
}

describe("Game transfer log visibility", () => {
  test("exchange with pyramid logs full card details for all viewers", () => {
    const seat0 = new Seat(
      0,
      new TestController(),
      new PlayerHand([{ suit: "mountains", value: 2 }]),
      false
    );
    const seat1 = new Seat(
      1,
      new TestController(),
      new PlayerHand([{ suit: "shadows", value: 2 }]),
      false
    );
    const pyramid = new Seat(
      2,
      new TestController(),
      new PyramidHand([{ suit: "forests", value: 3 }]),
      true
    );

    const game = new Game(2, 3, [seat0, seat1, pyramid], null, 0);
    const logs: Array<{ line: string; visibleTo?: number[] }> = [];
    game.onLog = (line, _important, options) => {
      logs.push({ line, visibleTo: options?.visibleTo });
    };

    game.completeExchange(
      {
        fromSeat: seat0,
        toSeat: pyramid,
        cardFromFirst: { suit: "mountains", value: 2 },
        cardFromSecond: { suit: "forests", value: 3 },
      },
      { frodoSeat: null, exchangeMade: false }
    );

    expect(logs).toHaveLength(2);
    expect(logs[0]!.line).toContain("gives 2 of mountains");
    expect(logs[1]!.line).toContain("gives 3 of forests");
    expect(logs[0]!.visibleTo).toBeUndefined();
    expect(logs[1]!.visibleTo).toBeUndefined();
  });

  test("giveCard to pyramid logs full card details for all viewers", async () => {
    const seat0 = new Seat(
      0,
      new FirstCardController(),
      new PlayerHand([{ suit: "hills", value: 4 }]),
      false
    );
    const seat1 = new Seat(
      1,
      new TestController(),
      new PlayerHand([{ suit: "shadows", value: 2 }]),
      false
    );
    const pyramid = new Seat(
      2,
      new TestController(),
      new PyramidHand([]),
      true
    );

    const game = new Game(2, 3, [seat0, seat1, pyramid], null, 0);
    const logs: Array<{ line: string; visibleTo?: number[] }> = [];
    game.onLog = (line, _important, options) => {
      logs.push({ line, visibleTo: options?.visibleTo });
    };

    await game.giveCard(seat0, pyramid);

    expect(logs).toHaveLength(1);
    expect(logs[0]!.line).toContain("gives 4 of hills");
    expect(logs[0]!.visibleTo).toBeUndefined();
  });

  test("non-pyramid giveCard still redacts for non-participants", async () => {
    const seat0 = new Seat(
      0,
      new FirstCardController(),
      new PlayerHand([{ suit: "rings", value: 5 }]),
      false
    );
    const seat1 = new Seat(
      1,
      new TestController(),
      new PlayerHand([{ suit: "hills", value: 2 }]),
      false
    );
    const seat2 = new Seat(
      2,
      new TestController(),
      new PlayerHand([{ suit: "forests", value: 2 }]),
      false
    );

    const game = new Game(3, 3, [seat0, seat1, seat2], null, 0);
    const logs: Array<{ visibleTo?: number[] }> = [];
    game.onLog = (_line, _important, options) => {
      logs.push({ visibleTo: options?.visibleTo });
    };

    await game.giveCard(seat0, seat1);

    expect(logs).toHaveLength(1);
    expect(logs[0]!.visibleTo).toEqual([0, 1]);
  });

  test("giveCard from revealed hand logs full card details for all viewers", async () => {
    const seat0 = new Seat(
      0,
      new FirstCardController(),
      new PlayerHand([{ suit: "rings", value: 5 }]),
      false
    );
    const seat1 = new Seat(
      1,
      new TestController(),
      new PlayerHand([{ suit: "hills", value: 2 }]),
      false
    );
    const seat2 = new Seat(
      2,
      new TestController(),
      new PlayerHand([{ suit: "forests", value: 2 }]),
      false
    );

    seat0.hand.reveal();

    const game = new Game(3, 3, [seat0, seat1, seat2], null, 0);
    const logs: Array<{ line: string; visibleTo?: number[] }> = [];
    game.onLog = (line, _important, options) => {
      logs.push({ line, visibleTo: options?.visibleTo });
    };

    await game.giveCard(seat0, seat1);

    expect(logs).toHaveLength(1);
    expect(logs[0]!.line).toContain("gives 5 of rings");
    expect(logs[0]!.visibleTo).toBeUndefined();
  });
});
