import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifySiteToken, SITE_SESSION_COOKIE_NAME } from "@/lib/site-auth";

// Exclude static assets, internal Next.js paths, and public gate endpoints
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  // 1. Allow all auth endpoints without check (NextAuth: session, csrf, callback, etc. and Gate: login, logout, session)
  if (pathname.startsWith("/api/auth/")) {
    return NextResponse.next();
  }


  // 2. Read and verify site session token from cookies
  const token = request.cookies.get(SITE_SESSION_COOKIE_NAME)?.value;
  const session = token ? await verifySiteToken(token) : null;
  const isAuthenticated = Boolean(session && session.role);

  // 3. Handle /login page routing
  if (pathname === "/login" || pathname === "/login/") {
    if (isAuthenticated) {
      // If already logged in, redirect to callbackUrl or root
      const callbackUrl = request.nextUrl.searchParams.get("callbackUrl");
      if (callbackUrl && callbackUrl.startsWith("/")) {
        return NextResponse.redirect(new URL(callbackUrl, request.url));
      }
      return NextResponse.redirect(new URL("/0", request.url));
    }
    // Allow unauthenticated visitor to see /login
    return NextResponse.next();
  }

  // 4. If not authenticated, protect all pages and APIs
  if (!isAuthenticated) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        {
          error: "Unauthorized. Password akses diperlukan.",
          redirectTo: "/login",
        },
        { status: 401 }
      );
    }

    const loginUrl = new URL("/login", request.url);
    if (pathname !== "/" && pathname !== "/0") {
      loginUrl.searchParams.set("callbackUrl", pathname + search);
    }
    return NextResponse.redirect(loginUrl);
  }

  // 5. Restrict Settings page for non-admin roles (Pengguna biasa dilarang akses setting)
  if (session && session.role !== "admin") {
    // Regex matches /[accountIndex]/settings or /settings
    if (pathname.match(/^\/(?:\d+\/)?settings(?:\/.*)?$/)) {
      const targetMatch = pathname.match(/^\/(\d+)\/settings/);
      const accountIndex = targetMatch ? targetMatch[1] : "0";
      return NextResponse.redirect(new URL(`/${accountIndex}`, request.url));
    }
  }

  return NextResponse.next();
}
