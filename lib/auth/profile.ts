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
  metadata: Record<string, unknown>,
  keys: string[],
): string {
  for (const key of keys) {
    const value = asString(metadata[key]);
    if (value) return value;
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

  const metadata = user.user_metadata ?? {};
  const fullName =
    getMetadataValue(metadata, ["full_name", "name", "display_name"]) ||
    user.email?.split("@")[0] ||
    "Dragg";
  const { firstName, lastName } = splitName(fullName);

  return {
    avatarUrl: getMetadataValue(metadata, [
      "avatar_url",
      "picture",
      "photo_url",
    ]),
    createdAt: user.created_at ?? null,
    email: user.email ?? asString(claims.email),
    firstName,
    fullName,
    lastName,
  };
}
