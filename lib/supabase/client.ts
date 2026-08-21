import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      auth: {
        // exchangeCodeForSession roda server-side, sem `window` pra ler
        // sb_flow_id sozinho — sem isso, o cookie verificador PKCE deste
        // flow (`-flow-<id>-code-verifier`) fica órfão a cada login.
        experimental: { appendPkceFlowIdToRedirects: true },
      },
    },
  );
}
