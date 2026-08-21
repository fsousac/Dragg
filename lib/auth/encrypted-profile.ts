import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import {
  encryptField,
  isAlreadyEncrypted,
} from "@/lib/crypto/field-encryption";

export async function ensureEncryptedProfile(
  supabase: SupabaseClient,
  userId: string,
  identity: { email: string; name: string },
) {
  const { data } = await supabase
    .from("profiles")
    .select("name, email")
    .eq("id", userId)
    .maybeSingle();

  if (
    isAlreadyEncrypted(data?.name ?? null) &&
    isAlreadyEncrypted(data?.email ?? null)
  ) {
    return;
  }

  await supabase
    .from("profiles")
    .update({
      email: encryptField(identity.email),
      name: encryptField(identity.name),
    })
    .eq("id", userId);
}
