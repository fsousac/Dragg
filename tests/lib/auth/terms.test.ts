import { describe, expect, it, vi } from "vitest";

import { requireAcceptedTerms } from "@/lib/auth/terms";

vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`);
  }),
}));

function mockSupabase(termsAccepted: boolean | null) {
  const single = vi
    .fn()
    .mockResolvedValue({ data: { terms_accepted: termsAccepted } });
  const eq = vi.fn(() => ({ single }));
  const select = vi.fn(() => ({ eq }));
  const from = vi.fn(() => ({ select }));

  return { from, select, eq, single };
}

describe("requireAcceptedTerms", () => {
  it("does nothing when the user has accepted the terms", async () => {
    const supabase = mockSupabase(true);

    await expect(
      requireAcceptedTerms(supabase as never, "user-1"),
    ).resolves.toBeUndefined();
    expect(supabase.from).toHaveBeenCalledWith("profiles");
    expect(supabase.select).toHaveBeenCalledWith("terms_accepted");
    expect(supabase.eq).toHaveBeenCalledWith("id", "user-1");
  });

  it("redirects to the accept-terms page when the terms have not been accepted", async () => {
    const supabase = mockSupabase(false);

    await expect(
      requireAcceptedTerms(supabase as never, "user-1"),
    ).rejects.toThrow("REDIRECT:/auth/accept-terms");
  });

  it("redirects when the profile row is missing", async () => {
    const supabase = mockSupabase(null);
    supabase.single.mockResolvedValueOnce({ data: null });

    await expect(
      requireAcceptedTerms(supabase as never, "user-1"),
    ).rejects.toThrow("REDIRECT:/auth/accept-terms");
  });
});
