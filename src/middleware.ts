import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  // App files (service worker, manifest, icons, offline screen, app links) skip the session check.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sw\\.js|manifest\\.webmanifest|offline\\.html|icons/|frames/|\\.well-known/|api/assetlinks|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
