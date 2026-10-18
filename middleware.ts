import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { supabaseConfigured } from "@/lib/config";

export async function middleware(request: NextRequest) {
  // Until Supabase is connected, let every page load so the setup message shows.
  if (!supabaseConfigured) {
    return NextResponse.next();
  }

  const { response, user } = await updateSession(request);
  const path = request.nextUrl.pathname;

  const needsLogin =
    path.startsWith("/projects") || path.startsWith("/account");

  if (!user && needsLogin) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    return NextResponse.redirect(url);
  }

  if (user && path === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/projects";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sw\\.js|manifest\\.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
