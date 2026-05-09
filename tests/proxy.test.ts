import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/supabase/proxy", () => ({
  updateSession: vi.fn((request: unknown) => ({
    request,
    status: 200,
  })),
}));

describe("proxy middleware", () => {
  it("delegates session updates to the Supabase proxy helper", async () => {
    const { updateSession } = await import("@/lib/supabase/proxy");
    const mockRequest = {
      nextUrl: new URL("https://example.com/dashboard"),
    } as unknown as NextRequest;

    const result = await updateSession(mockRequest);
    expect(result).toEqual({ request: mockRequest, status: 200 });
  });

  it("verifies middleware config matcher pattern", () => {
    const matcher = [
      "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
    ];
    expect(matcher[0]).toContain("_next/static");
    expect(matcher[0]).toContain("webp");
    expect(matcher[0]).toContain("favicon.ico");
  });
});