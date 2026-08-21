import { NextResponse, type NextRequest } from "next/server";

import { getSafeRedirectPath } from "@/lib/auth/redirect";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = requestUrl.searchParams.get("next");
  const flowId = requestUrl.searchParams.get("sb_flow_id");
  const redirectPath = getSafeRedirectPath(next);

  if (code) {
    const supabase = await createClient();
    // flowId deixa exchangeCodeForSession limpar o cookie verificador
    // PKCE deste próprio login (por que é passado via query param: ver
    // lib/supabase/client.ts).
    const { data } = await supabase.auth.exchangeCodeForSession(
      code,
      flowId ? { flowId } : undefined,
    );

    // Os tokens do provider (access/refresh do Google) nunca são lidos
    // por este app; re-salvar via setSession os descarta da sessão.
    if (data.session) {
      await supabase.auth.setSession({
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
      });
    }
  }

  return NextResponse.redirect(new URL(redirectPath, requestUrl.origin));
}
