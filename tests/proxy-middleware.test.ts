import { NextResponse } from "next/server";
import { describe, expect, it, vi } from "vitest";

const { updateSession } = vi.hoisted(() => ({
  updateSession: vi.fn(),
}));

vi.mock("@/lib/supabase/proxy", () => ({ updateSession }));

import middleware, { config } from "@/proxy";

describe("middleware", () => {
  it("delegates the request to updateSession and returns its response", async () => {
    const response = NextResponse.next();
    updateSession.mockResolvedValue(response);

    const request = { url: "http://localhost/dashboard" } as never;
    const result = await middleware(request);

    expect(updateSession).toHaveBeenCalledWith(request);
    expect(result).toBe(response);
  });

  it("excludes Next.js internals and static assets from the matcher", () => {
    const matcher = new RegExp(`^${config.matcher[0]}$`);

    expect(matcher.test("/dashboard")).toBe(true);
    expect(matcher.test("/_next/static/chunk.js")).toBe(false);
    expect(matcher.test("/favicon.ico")).toBe(false);
    expect(matcher.test("/logo.png")).toBe(false);
  });
});
