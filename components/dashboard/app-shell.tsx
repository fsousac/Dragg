import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { Header } from "@/components/dashboard/header";
import { MobileNav } from "@/components/dashboard/mobile-nav";
import { NavigationPrefetcher } from "@/components/dashboard/navigation-prefetcher";
import { Sidebar } from "@/components/dashboard/sidebar";
import { createClient } from "@/lib/supabase/server";

function getDisplayName(email: string) {
  return email.split("@")[0] || "Dragg";
}

function getInitials(name: string) {
  return (
    name
      .split(/[\s._-]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "D"
  );
}

function getMetadataValue(
  metadata: Array<Record<string, unknown> | undefined | null>,
  keys: string[],
) {
  for (const source of metadata) {
    if (!source) continue;

    for (const key of keys) {
      const value = source[key];
      if (typeof value === "string" && value.trim()) {
        return value;
      }
    }
  }

  return null;
}

function getAvatarUrl(metadata: Array<Record<string, unknown> | undefined | null>) {
  const directValue = getMetadataValue(metadata, [
    "avatar_url",
    "avatarUrl",
    "picture",
    "photo_url",
    "photoUrl",
  ]);

  if (directValue) {
    return directValue;
  }

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

  return null;
}

interface AppShellProps {
  children: ReactNode;
}

export async function AppShell({ children }: AppShellProps) {
  const supabase = await createClient();
  const [{ data: claimsData }, { data: userData }] = await Promise.all([
    supabase.auth.getClaims(),
    supabase.auth.getUser(),
  ]);

  const claims = claimsData?.claims;
  const user = userData?.user;

  if (!claims || !user) {
    redirect("/");
  }

  const userEmail = user.email ?? claims.email ?? "";
  const userName =
    user.user_metadata?.full_name ??
    user.user_metadata?.name ??
    getDisplayName(userEmail);
  const initials = getInitials(userName);
  const identityMetadata = user.identities
    ?.map((identity) => identity.identity_data as Record<string, unknown>)
    .filter(Boolean);
  const avatarUrl = getAvatarUrl([
    user.user_metadata ?? {},
    user.app_metadata ?? {},
    claims as Record<string, unknown>,
    ...(identityMetadata ?? []),
  ]);

  async function signOut() {
    "use server";

    const supabase = await createClient();
    await supabase.auth.signOut();
    redirect("/");
  }

  return (
    <div className="flex min-h-screen bg-background">
      <NavigationPrefetcher />

      <Sidebar
        initials={initials}
        signOutAction={signOut}
        userAvatarUrl={avatarUrl}
        userEmail={userEmail}
        userName={userName}
      />

      <main className="flex-1 min-w-0">
        <Header
          initials={initials}
          userAvatarUrl={avatarUrl}
          userName={userName}
        />
        <div className="px-4 lg:px-8 py-4 lg:py-6 pb-24 lg:pb-8">
          {children}
        </div>
      </main>

      <MobileNav />
    </div>
  );
}
