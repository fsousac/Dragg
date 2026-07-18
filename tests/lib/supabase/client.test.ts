import { afterEach, describe, expect, it, vi } from "vitest";

const { createBrowserClient } = vi.hoisted(() => ({
  createBrowserClient: vi.fn().mockReturnValue({ marker: "browser-client" }),
}));

vi.mock("@supabase/ssr", () => ({ createBrowserClient }));

import { createClient } from "@/lib/supabase/client";

describe("createClient (browser)", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("creates a Supabase browser client using the configured project URL and publishable key", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://project.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "publishable-key");

    const client = createClient();

    expect(createBrowserClient).toHaveBeenCalledWith(
      "https://project.supabase.co",
      "publishable-key",
    );
    expect(client).toEqual({ marker: "browser-client" });
  });
});
