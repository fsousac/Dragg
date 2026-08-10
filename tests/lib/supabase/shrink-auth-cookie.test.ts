import { createChunks, stringFromBase64URL, stringToBase64URL } from "@supabase/ssr";
import { describe, expect, it } from "vitest";

import {
  shrinkAuthTokenCookies,
  type CookieToSet,
} from "@/lib/supabase/shrink-auth-cookie";

const BASE64_PREFIX = "base64-";
const KEY = "sb-project-auth-token";

function encodeSession(session: unknown) {
  return BASE64_PREFIX + stringToBase64URL(JSON.stringify(session));
}

function decodeSession(cookies: CookieToSet[]) {
  const value = cookies
    .filter(({ value }) => value)
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }))
    .map(({ value }) => value)
    .join("");

  return JSON.parse(stringFromBase64URL(value.slice(BASE64_PREFIX.length)));
}

function chunkCookies(key: string, value: string): CookieToSet[] {
  return createChunks(key, value).map(({ name, value }) => ({
    name,
    value,
    options: { path: "/" },
  }));
}

describe("shrinkAuthTokenCookies", () => {
  it("leaves non-auth-token cookies untouched", () => {
    const cookies: CookieToSet[] = [
      { name: "some-other-cookie", value: "abc", options: {} },
    ];

    expect(shrinkAuthTokenCookies(cookies)).toEqual(cookies);
  });

  it("drops identities and duplicate metadata, shrinking a two-chunk cookie into one", () => {
    const session = {
      user: {
        identities: Array.from({ length: 40 }, (_, i) => ({
          id: `identity-${i}`,
          identity_data: { some: "provider payload".repeat(5) },
        })),
        user_metadata: {
          avatar_url: "https://example.com/pic.png",
          picture: "https://example.com/pic.png",
          full_name: "Ada Lovelace",
          name: "Ada Lovelace",
          provider_id: "12345",
          sub: "12345",
        },
      },
    };

    const original = chunkCookies(KEY, encodeSession(session));
    expect(original.length).toBeGreaterThan(1);

    const shrunk = shrinkAuthTokenCookies(original);

    const decoded = decodeSession(shrunk);
    expect(decoded.user.identities).toBeUndefined();
    expect(decoded.user.user_metadata).toEqual({
      avatar_url: "https://example.com/pic.png",
      full_name: "Ada Lovelace",
      provider_id: "12345",
    });

    const realChunk = shrunk.find(({ name }) => name === KEY);
    expect(realChunk).toBeDefined();

    const zeroedOriginals = shrunk.filter(
      ({ name }) => name !== KEY && original.some((c) => c.name === name),
    );
    expect(zeroedOriginals).toHaveLength(original.length);
    zeroedOriginals.forEach(({ value, options }) => {
      expect(value).toBe("");
      expect(options.maxAge).toBe(0);
    });
  });

  it("falls back to the untouched cookie when the value isn't a decodable session", () => {
    const cookies: CookieToSet[] = [
      { name: KEY, value: "not-base64-prefixed", options: {} },
    ];

    expect(shrinkAuthTokenCookies(cookies)).toEqual(cookies);
  });

  it("leaves a cookie unchanged when there's nothing to trim", () => {
    const session = { user: { id: "1" } };
    const cookies = chunkCookies(KEY, encodeSession(session));

    expect(shrinkAuthTokenCookies(cookies)).toEqual(cookies);
  });

  it("passes through removal cookies (empty value) for an auth-token key untouched", () => {
    const cookies: CookieToSet[] = [
      { name: KEY, value: "", options: { maxAge: 0 } },
    ];

    expect(shrinkAuthTokenCookies(cookies)).toEqual(cookies);
  });
});
