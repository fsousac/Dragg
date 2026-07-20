import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { Header } from "@/components/dashboard/header";
import { MobileNav } from "@/components/dashboard/mobile-nav";
import { NavigationPrefetcher } from "@/components/dashboard/navigation-prefetcher";
import { PageTransition } from "@/components/dashboard/page-transition";
import { Sidebar } from "@/components/dashboard/sidebar";
import { requireAcceptedTerms } from "@/lib/auth/terms";
import type {
  AuthenticatedUserClaims,
  AuthenticatedUserContext,
} from "@/lib/finance/transactions";
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

function isAvatarKey(key: string) {
  const lowerKey = key.toLowerCase();
  return (
    lowerKey.includes("avatar") ||
    lowerKey.includes("picture") ||
    lowerKey.includes("photo")
  );
}

function isImageUrl(value: string) {
  return (
    /^https?:\/\//.test(value) &&
    /(googleusercontent|gravatar|avatar|photo|picture|image)/i.test(value)
  );
}

function findAvatarInEntries(value: object, queue: unknown[]) {
  for (const [key, nestedValue] of Object.entries(value)) {
    if (typeof nestedValue === "string") {
      if (isAvatarKey(key) || isImageUrl(nestedValue)) {
        return nestedValue;
      }
    } else if (nestedValue && typeof nestedValue === "object") {
      queue.push(nestedValue);
    }
  }

  return null;
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

    const found = findAvatarInEntries(value, queue);
    if (found) {
      return found;
    }
  }

  return null;
}

interface AppShellProps {
  children: ReactNode;
  userContext?: AuthenticatedUserContext;
}

async function getShellUser(userContext?: AuthenticatedUserContext) {
  if (userContext) {
    return {
      claims: userContext.claims,
      supabase: userContext.supabase,
      user: userContext.user,
    };
  }

  const supabase = await createClient();
  const [{ data: claimsData }, { data: userData }] = await Promise.all([
    supabase.auth.getClaims(),
    supabase.auth.getUser(),
  ]);

  return {
    claims: claimsData?.claims as AuthenticatedUserClaims | undefined,
    supabase,
    user: userData?.user,
  };
}

async function signOut() {
  "use server";

  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

export async function AppShell({
  children,
  userContext,
}: Readonly<AppShellProps>) {
  const { claims, supabase, user } = await getShellUser(userContext);

  if (!claims || !user) {
    redirect("/");
  }

  await requireAcceptedTerms(supabase, user.id);

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
          <PageTransition>{children}</PageTransition>
        </div>
      </main>

      <MobileNav />
    </div>
  );
}
