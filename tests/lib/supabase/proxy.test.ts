import { NextRequest, NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { createServerClient } = vi.hoisted(() => ({
  createServerClient: vi.fn(),
}));

vi.mock("@supabase/ssr", () => ({ createServerClient }));

import { updateSession } from "@/lib/supabase/proxy";

describe("updateSession", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("refreshes the session and forwards the resulting cookies/headers onto the response", async () => {
    createServerClient.mockImplementation((_url, _key, options) => ({
      auth: {
        getClaims: vi.fn(async () => {
          // Mirrors what @supabase/ssr does internally when it refreshes a
          // session: it reads the incoming cookies, then re-sets the
          // refreshed ones (and any headers) through the config it was given.
          expect(options.cookies.getAll()).toEqual([
            { name: "existing", value: "1" },
          ]);
          options.cookies.setAll(
            [{ name: "sb-token", value: "abc", options: { path: "/" } }],
            { "x-refreshed": "1" },
          );
          return { data: { claims: { sub: "1" } } };
        }),
      },
    }));

    const request = new NextRequest("http://localhost/dashboard", {
      headers: { cookie: "existing=1" },
    });

    const response = await updateSession(request);

    expect(response).toBeInstanceOf(NextResponse);
    expect(request.cookies.get("sb-token")?.value).toBe("abc");
    expect(response.cookies.get("sb-token")?.value).toBe("abc");
    expect(response.headers.get("x-refreshed")).toBe("1");
  });
});
