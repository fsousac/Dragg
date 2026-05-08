import { describe, expect, it, vi } from "vitest";

import { config, proxy } from "@/proxy";
import { updateSession } from "@/lib/supabase/proxy";

vi.mock("@/lib/supabase/proxy", () => ({
  updateSession: vi.fn((request: unknown) => ({
    request,
    status: 200,
  })),
}));

describe("proxy middleware", () => {
  it("delegates session updates to the Supabase proxy helper", async () => {
    const request = { nextUrl: new URL("https://example.com/dashboard") };

    await expect(proxy(request as never)).resolves.toEqual({
      request,
      status: 200,
    });
    expect(updateSession).toHaveBeenCalledWith(request);
  });

  it("keeps a matcher that skips Next assets and common images", () => {
    expect(config.matcher[0]).toContain("_next/static");
    expect(config.matcher[0]).toContain("webp");
  });
});
