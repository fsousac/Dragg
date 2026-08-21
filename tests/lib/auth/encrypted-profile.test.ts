import { describe, expect, it, vi } from "vitest";

import { ensureEncryptedProfile } from "@/lib/auth/encrypted-profile";

vi.mock("@/lib/crypto/field-encryption", () => ({
  encryptField: vi.fn((value: string | null) =>
    value ? `enc:${value}` : null,
  ),
  isAlreadyEncrypted: vi.fn(
    (value: string | null) => typeof value === "string" && value.startsWith("enc:"),
  ),
}));

function mockSupabase(row: { name: string | null; email: string | null } | null) {
  const maybeSingle = vi.fn().mockResolvedValue({ data: row });
  const eq = vi.fn(() => ({ maybeSingle }));
  const select = vi.fn(() => ({ eq }));

  const updateEq = vi.fn().mockResolvedValue({ error: null });
  const update = vi.fn(() => ({ eq: updateEq }));

  const from = vi.fn(() => ({ select, update }));

  return { from, select, eq, maybeSingle, update, updateEq };
}

describe("ensureEncryptedProfile", () => {
  it("does nothing when name and email are already encrypted", async () => {
    const supabase = mockSupabase({ name: "enc:Ana", email: "enc:ana@example.com" });

    await ensureEncryptedProfile(
      supabase as never,
      "user-1",
      { email: "ana@example.com", name: "Ana" },
    );

    expect(supabase.update).not.toHaveBeenCalled();
  });

  it("encrypts and writes name/email when the row is null (fresh signup trigger)", async () => {
    const supabase = mockSupabase({ name: null, email: null });

    await ensureEncryptedProfile(
      supabase as never,
      "user-1",
      { email: "ana@example.com", name: "Ana" },
    );

    expect(supabase.update).toHaveBeenCalledWith({
      email: "enc:ana@example.com",
      name: "enc:Ana",
    });
    expect(supabase.updateEq).toHaveBeenCalledWith("id", "user-1");
  });

  it("encrypts and writes name/email when only one of the two is already encrypted", async () => {
    const supabase = mockSupabase({ name: "enc:Ana", email: "ana@example.com" });

    await ensureEncryptedProfile(
      supabase as never,
      "user-1",
      { email: "ana@example.com", name: "Ana" },
    );

    expect(supabase.update).toHaveBeenCalledWith({
      email: "enc:ana@example.com",
      name: "enc:Ana",
    });
  });

  it("encrypts and writes name/email when name is encrypted but email is null", async () => {
    const supabase = mockSupabase({ name: "enc:Ana", email: null });

    await ensureEncryptedProfile(
      supabase as never,
      "user-1",
      { email: "ana@example.com", name: "Ana" },
    );

    expect(supabase.update).toHaveBeenCalledWith({
      email: "enc:ana@example.com",
      name: "enc:Ana",
    });
  });

  it("encrypts and writes name/email when the row still has legacy plaintext", async () => {
    const supabase = mockSupabase({ name: "Ana", email: "ana@example.com" });

    await ensureEncryptedProfile(
      supabase as never,
      "user-1",
      { email: "ana@example.com", name: "Ana" },
    );

    expect(supabase.update).toHaveBeenCalledWith({
      email: "enc:ana@example.com",
      name: "enc:Ana",
    });
  });

  it("treats a missing profile row as needing encryption", async () => {
    const supabase = mockSupabase(null);

    await ensureEncryptedProfile(
      supabase as never,
      "user-1",
      { email: "ana@example.com", name: "Ana" },
    );

    expect(supabase.update).toHaveBeenCalledWith({
      email: "enc:ana@example.com",
      name: "enc:Ana",
    });
  });
});
