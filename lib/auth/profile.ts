import "server-only";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export type OAuthProfile = {
  avatarUrl: string | null;
  createdAt: string | null;
  email: string;
  firstName: string;
  fullName: string;
  lastName: string;
};

function asString(value: unknown) {
  return typeof value === "string" ? value : "";
}

function splitName(fullName: string) {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);

  return {
    firstName: parts[0] ?? "",
    lastName: parts.slice(1).join(" "),
  };
}

function getMetadataValue(
  metadata: Array<Record<string, unknown> | undefined | null>,
  keys: string[],
): string {
  for (const source of metadata) {
    if (!source) continue;

    for (const key of keys) {
      const value = asString(source[key]);
      if (value) return value;
    }
  }

  return "";
}

function getAvatarUrl(
  metadata: Array<Record<string, unknown> | undefined | null>,
) {
  const directValue = getMetadataValue(metadata, [
    "avatar_url",
    "avatarUrl",
    "picture",
    "photo_url",
    "photoUrl",
  ]);

  if (directValue) return directValue;

  const queue: unknown[] = [...metadata];

  while (queue.length) {
    const value = queue.shift();

    if (Array.isArray(value)) {
      queue.push(...value);
      continue;
    }

    if (!value || typeof value !== "object") {
      continue;
    }

    for (const [key, nestedValue] of Object.entries(value)) {
      if (typeof nestedValue === "string") {
        const lowerKey = key.toLowerCase();
        const looksLikeAvatarKey =
          lowerKey.includes("avatar") ||
          lowerKey.includes("picture") ||
          lowerKey.includes("photo");
        const looksLikeImageUrl =
          /^https?:\/\//.test(nestedValue) &&
          /(googleusercontent|gravatar|avatar|photo|picture|image)/i.test(
            nestedValue,
          );

        if (looksLikeAvatarKey || looksLikeImageUrl) {
          return nestedValue;
        }
      } else if (nestedValue && typeof nestedValue === "object") {
        queue.push(nestedValue);
      }
    }
  }

  return "";
}

export async function getOAuthProfile(): Promise<OAuthProfile> {
  const supabase = await createClient();
  const [{ data: claimsData }, { data: userData }] = await Promise.all([
    supabase.auth.getClaims(),
    supabase.auth.getUser(),
  ]);

  const user = userData.user;
  const claims = claimsData?.claims;

  if (!claims?.sub || !user) {
    redirect("/");
  }

  const identityMetadata = user.identities
    ?.map((identity) => identity.identity_data as Record<string, unknown>)
    .filter(Boolean);
  const metadata = [
    user.user_metadata ?? {},
    user.app_metadata ?? {},
    claims as Record<string, unknown>,
    ...(identityMetadata ?? []),
  ];
  const fullName =
    getMetadataValue(metadata, ["full_name", "name", "display_name"]) ||
    user.email?.split("@")[0] ||
    "Dragg";
  const { firstName, lastName } = splitName(fullName);

  return {
    avatarUrl: getAvatarUrl(metadata),
    createdAt: user.created_at ?? null,
    email: user.email ?? asString(claims.email),
    firstName,
    fullName,
    lastName,
  };
}
