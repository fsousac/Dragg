import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { createServerClient } = vi.hoisted(() => ({
  createServerClient: vi.fn(),
}));
const { cookies } = vi.hoisted(() => ({
  cookies: vi.fn(),
}));

vi.mock("@supabase/ssr", () => ({ createServerClient }));
vi.mock("next/headers", () => ({ cookies }));

import { createClient } from "@/lib/supabase/server";

describe("createClient (server)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://project.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "publishable-key");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("builds a server client wired to the request's cookie store", async () => {
    const cookieStore = {
      getAll: vi.fn().mockReturnValue([{ name: "a", value: "1" }]),
      set: vi.fn(),
    };
    cookies.mockResolvedValue(cookieStore);
    createServerClient.mockReturnValue({ marker: "server-client" });

    const client = await createClient();

    expect(createServerClient).toHaveBeenCalledWith(
      "https://project.supabase.co",
      "publishable-key",
      expect.objectContaining({ cookies: expect.any(Object) }),
    );
    expect(client).toEqual({ marker: "server-client" });

    const cookieConfig = createServerClient.mock.calls[0][2].cookies;
    expect(cookieConfig.getAll()).toEqual([{ name: "a", value: "1" }]);

    cookieConfig.setAll([{ name: "x", value: "y", options: { path: "/" } }]);
    expect(cookieStore.set).toHaveBeenCalledWith("x", "y", { path: "/" });
  });

  it("swallows errors when setting cookies outside a Server Action/Route Handler", async () => {
    const cookieStore = {
      getAll: vi.fn(),
      set: vi.fn(() => {
        throw new Error("cannot set cookies here");
      }),
    };
    cookies.mockResolvedValue(cookieStore);
    createServerClient.mockReturnValue({});

    await createClient();
    const cookieConfig = createServerClient.mock.calls[0][2].cookies;

    expect(() =>
      cookieConfig.setAll([{ name: "x", value: "y", options: {} }]),
    ).not.toThrow();
  });
});
