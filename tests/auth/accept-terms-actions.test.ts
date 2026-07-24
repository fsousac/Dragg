import { beforeEach, describe, expect, it, vi } from "vitest";

const { createClient } = vi.hoisted(() => ({ createClient: vi.fn() }));

vi.mock("@/lib/supabase/server", () => ({ createClient }));
vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`);
  }),
}));

import { acceptTermsAction } from "@/app/auth/accept-terms/actions";

function mockSupabase(user: { id: string } | null) {
  const eq = vi.fn().mockResolvedValue({ data: null, error: null });
  const update = vi.fn(() => ({ eq }));
  const from = vi.fn(() => ({ update }));

  return {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user } }) },
    from,
    update,
    eq,
  };
}

describe("acceptTermsAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("redirects home when there is no authenticated user", async () => {
    createClient.mockResolvedValue(mockSupabase(null));

    await expect(acceptTermsAction()).rejects.toThrow("REDIRECT:/");
  });

  it("records acceptance for the current user and redirects to the dashboard", async () => {
    const supabase = mockSupabase({ id: "user-1" });
    createClient.mockResolvedValue(supabase);

    await expect(acceptTermsAction()).rejects.toThrow("REDIRECT:/dashboard");

    expect(supabase.from).toHaveBeenCalledWith("profiles");
    expect(supabase.update).toHaveBeenCalledWith({ terms_accepted: true });
    expect(supabase.eq).toHaveBeenCalledWith("id", "user-1");
  });
});
