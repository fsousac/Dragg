import { beforeEach, describe, expect, it, vi } from "vitest";

import { getOAuthProfile } from "@/lib/auth/profile";
import { createClient } from "@/lib/supabase/server";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`);
  }),
}));

type FakeUser = {
  id?: string;
  email?: string;
  created_at?: string | null;
  user_metadata?: Record<string, unknown>;
  app_metadata?: Record<string, unknown>;
  identities?: Array<{ identity_data: Record<string, unknown> | null }>;
};

function mockSupabase(
  claims: Record<string, unknown> | null,
  user: FakeUser | null,
) {
  vi.mocked(createClient).mockResolvedValue({
    auth: {
      getClaims: vi.fn().mockResolvedValue({ data: claims ? { claims } : null }),
      getUser: vi.fn().mockResolvedValue({ data: { user } }),
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any);
}

describe("getOAuthProfile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("redirects home when claims are missing a sub", async () => {
    mockSupabase({}, { id: "1", email: "a@example.com" });

    await expect(getOAuthProfile()).rejects.toThrow("REDIRECT:/");
  });

  it("redirects home when there is no authenticated user", async () => {
    mockSupabase({ sub: "123" }, null);

    await expect(getOAuthProfile()).rejects.toThrow("REDIRECT:/");
  });

  it("builds a full profile from direct metadata, filtering falsy identities", async () => {
    mockSupabase(
      { sub: "1" },
      {
        email: "ada@example.com",
        created_at: "2020-01-01T00:00:00Z",
        user_metadata: {
          full_name: "Ada Lovelace",
          avatar_url: "https://example.com/a.png",
        },
        app_metadata: {},
        identities: [
          { identity_data: null },
          { identity_data: { unused: "value" } },
        ],
      },
    );

    await expect(getOAuthProfile()).resolves.toEqual({
      avatarUrl: "https://example.com/a.png",
      createdAt: "2020-01-01T00:00:00Z",
      email: "ada@example.com",
      firstName: "Ada",
      fullName: "Ada Lovelace",
      lastName: "Lovelace",
    });
  });

  it("falls back to 'Dragg' name and claims email, finding avatar via nested object URL match", async () => {
    mockSupabase(
      { sub: "4", email: "claims4@example.com" },
      {
        email: undefined,
        created_at: undefined,
        user_metadata: {
          profile: {
            social: {
              link: "https://lh3.googleusercontent.com/a-xyz",
            },
          },
        },
        app_metadata: {},
        identities: undefined,
      },
    );

    await expect(getOAuthProfile()).resolves.toEqual({
      avatarUrl: "https://lh3.googleusercontent.com/a-xyz",
      createdAt: null,
      email: "claims4@example.com",
      firstName: "Dragg",
      fullName: "Dragg",
      lastName: "",
    });
  });

  it("falls back to email-derived name and finds avatar via nested key match", async () => {
    mockSupabase(
      { sub: "5" },
      {
        email: "grace@example.com",
        created_at: "2021-05-05T00:00:00Z",
        user_metadata: {
          profile: { picture: "https://cdn.example.com/p.jpg" },
        },
        app_metadata: {},
        identities: [{ identity_data: {} }],
      },
    );

    await expect(getOAuthProfile()).resolves.toEqual({
      avatarUrl: "https://cdn.example.com/p.jpg",
      createdAt: "2021-05-05T00:00:00Z",
      email: "grace@example.com",
      firstName: "grace",
      fullName: "grace",
      lastName: "",
    });
  });

  it("finds name via display_name and reports no avatar when nothing matches", async () => {
    mockSupabase(
      { sub: "6", display_name: "Grace Hopper" },
      {
        email: "grace6@example.com",
        created_at: undefined,
        user_metadata: {
          bio: "just a bio",
          tags: [null, "skip-me", 42, { note: "no match" }],
          website: "https://example.com/nothing-here",
        },
        app_metadata: {},
        identities: undefined,
      },
    );

    await expect(getOAuthProfile()).resolves.toEqual({
      avatarUrl: "",
      createdAt: null,
      email: "grace6@example.com",
      firstName: "Grace",
      fullName: "Grace Hopper",
      lastName: "Hopper",
    });
  });

  it("defaults missing user_metadata and app_metadata to empty objects", async () => {
    mockSupabase(
      { sub: "8" },
      {
        email: "noattrs@example.com",
        created_at: "2022-02-02T00:00:00Z",
        identities: undefined,
      },
    );

    await expect(getOAuthProfile()).resolves.toEqual({
      avatarUrl: "",
      createdAt: "2022-02-02T00:00:00Z",
      email: "noattrs@example.com",
      firstName: "noattrs",
      fullName: "noattrs",
      lastName: "",
    });
  });

  it("skips falsy metadata sources and null nested values while searching for an avatar", async () => {
    mockSupabase(
      { sub: "9" },
      {
        email: "skip@example.com",
        created_at: null,
        user_metadata: {
          profile: null,
        } as unknown as Record<string, unknown>,
        app_metadata: false as unknown as Record<string, unknown>,
        identities: undefined,
      },
    );

    await expect(getOAuthProfile()).resolves.toEqual({
      avatarUrl: "",
      createdAt: null,
      email: "skip@example.com",
      firstName: "skip",
      fullName: "skip",
      lastName: "",
    });
  });

  it("handles a whitespace-only name gracefully", async () => {
    mockSupabase(
      { sub: "7" },
      {
        email: "whoever@example.com",
        created_at: null,
        user_metadata: { full_name: "   " },
        app_metadata: {},
        identities: undefined,
      },
    );

    await expect(getOAuthProfile()).resolves.toEqual({
      avatarUrl: "",
      createdAt: null,
      email: "whoever@example.com",
      firstName: "",
      fullName: "   ",
      lastName: "",
    });
  });
});
