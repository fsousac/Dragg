import { describe, expect, it } from "vitest";

import { easeOutExpo } from "@/components/ui/number-counter";

describe("easeOutExpo", () => {
  it("returns 1 exactly when t is 1", () => {
    expect(easeOutExpo(1)).toBe(1);
  });

  it("returns 0 when t is 0", () => {
    expect(easeOutExpo(0)).toBe(1 - Math.pow(2, 0));
    expect(easeOutExpo(0)).toBeCloseTo(0);
  });

  it("returns values between 0 and 1 for intermediate t", () => {
    const half = easeOutExpo(0.5);
    expect(half).toBeGreaterThan(0);
    expect(half).toBeLessThan(1);
  });

  it("is monotonically increasing", () => {
    expect(easeOutExpo(0.25)).toBeLessThan(easeOutExpo(0.5));
    expect(easeOutExpo(0.5)).toBeLessThan(easeOutExpo(0.75));
    expect(easeOutExpo(0.75)).toBeLessThan(easeOutExpo(1));
  });
});
