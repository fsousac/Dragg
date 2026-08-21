import { type NextRequest } from "next/server";

import { updateSession } from "@/lib/supabase/proxy";

export default async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: ["/((?!_next/|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
