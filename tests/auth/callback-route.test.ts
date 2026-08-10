import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { exchangeCodeForSession, setSession, createClient } = vi.hoisted(() => ({
  exchangeCodeForSession: vi
    .fn()
    .mockResolvedValue({ data: { session: null }, error: null }),
  setSession: vi.fn(),
  createClient: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({ createClient }));

import { GET } from "@/app/auth/callback/route";

describe("GET /auth/callback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    exchangeCodeForSession.mockResolvedValue({
      data: { session: null },
      error: null,
    });
    createClient.mockResolvedValue({
      auth: { exchangeCodeForSession, setSession },
    });
  });

  it("exchanges the code for a session and redirects to the safe 'next' path", async () => {
    const request = new NextRequest(
      "http://localhost/auth/callback?code=abc123&next=/transactions",
    );

    const response = await GET(request);

    expect(exchangeCodeForSession).toHaveBeenCalledWith("abc123", undefined);
    expect(setSession).not.toHaveBeenCalled();
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "http://localhost/transactions",
    );
  });

  it("passes sb_flow_id through so the matching PKCE verifier cookie is cleaned up", async () => {
    const request = new NextRequest(
      "http://localhost/auth/callback?code=abc123&sb_flow_id=flow-xyz",
    );

    await GET(request);

    expect(exchangeCodeForSession).toHaveBeenCalledWith("abc123", {
      flowId: "flow-xyz",
    });
  });

  it("re-saves the session via setSession to drop the provider token bloat", async () => {
    exchangeCodeForSession.mockResolvedValue({
      data: {
        session: {
          access_token: "at-123",
          refresh_token: "rt-456",
          provider_token: "google-at",
        },
      },
      error: null,
    });
    const request = new NextRequest(
      "http://localhost/auth/callback?code=abc123",
    );

    await GET(request);

    expect(setSession).toHaveBeenCalledWith({
      access_token: "at-123",
      refresh_token: "rt-456",
    });
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
