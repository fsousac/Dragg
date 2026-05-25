import { describe, expect, it } from "vitest";

import { getGreetingPeriodFromHour } from "@/lib/time/greeting";

describe("getGreetingPeriodFromHour", () => {
  it.each([
    { hour: 0, period: "evening" },
    { hour: 4, period: "evening" },
    { hour: 5, period: "morning" },
    { hour: 11, period: "morning" },
    { hour: 12, period: "afternoon" },
    { hour: 15, period: "afternoon" },
    { hour: 17, period: "afternoon" },
    { hour: 18, period: "evening" },
    { hour: 23, period: "evening" },
  ] as const)("returns $period for hour $hour", ({ hour, period }) => {
    expect(getGreetingPeriodFromHour(hour)).toBe(period);
  });

  it.each([-1, 24, 1.5, Number.NaN])("rejects invalid hour %s", (hour) => {
    expect(() => getGreetingPeriodFromHour(hour)).toThrow(RangeError);
  });
});
