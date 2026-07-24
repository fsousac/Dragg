import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { exchangeCodeForSession, createClient } = vi.hoisted(() => ({
  exchangeCodeForSession: vi.fn().mockResolvedValue({ error: null }),
  createClient: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({ createClient }));

import { GET } from "@/app/auth/callback/route";

describe("GET /auth/callback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createClient.mockResolvedValue({
      auth: { exchangeCodeForSession },
    });
  });

  it("exchanges the code for a session and redirects to the safe 'next' path", async () => {
    const request = new NextRequest(
      "http://localhost/auth/callback?code=abc123&next=/transactions",
    );

    const response = await GET(request);

    expect(exchangeCodeForSession).toHaveBeenCalledWith("abc123");
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "http://localhost/transactions",
    );
  });

  it("skips the exchange and redirects to /dashboard when there is no code or 'next' param", async () => {
    const request = new NextRequest("http://localhost/auth/callback");

    const response = await GET(request);

    expect(exchangeCodeForSession).not.toHaveBeenCalled();
    expect(createClient).not.toHaveBeenCalled();
    expect(response.headers.get("location")).toBe(
      "http://localhost/dashboard",
    );
  });

  it("falls back to /dashboard when 'next' points off-site", async () => {
    const request = new NextRequest(
      "http://localhost/auth/callback?code=abc123&next=//evil.com",
    );

    const response = await GET(request);

    expect(response.headers.get("location")).toBe(
      "http://localhost/dashboard",
    );
  });
});
