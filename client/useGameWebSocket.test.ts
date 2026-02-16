import { describe, expect, test } from "bun:test";
import { shouldScheduleReconnect } from "./useGameWebSocket";

describe("shouldScheduleReconnect", () => {
  test("schedules reconnect for current socket when reconnect is enabled", () => {
    expect(
      shouldScheduleReconnect({
        isCurrentSocket: true,
        shouldReconnect: true,
      })
    ).toBe(true);
  });

  test("does not schedule reconnect for stale sockets", () => {
    expect(
      shouldScheduleReconnect({
        isCurrentSocket: false,
        shouldReconnect: true,
      })
    ).toBe(false);
  });

  test("does not schedule reconnect after intentional unmount/cleanup close", () => {
    expect(
      shouldScheduleReconnect({
        isCurrentSocket: true,
        shouldReconnect: false,
      })
    ).toBe(false);
  });
});
