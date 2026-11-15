import { NextResponse, type NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

/**
 * Optimistic session check only. Real session + membership checks happen in
 * layouts and actions; a stale cookie is never allowed to loop the login page.
 */
export function proxy(request: NextRequest): NextResponse {
  const hasSessionCookie = Boolean(getSessionCookie(request));
  if (hasSessionCookie) return NextResponse.next();

  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = "/login";
  loginUrl.search = "";
  if (request.nextUrl.pathname !== "/") {
    loginUrl.searchParams.set("next", request.nextUrl.pathname);
  }
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/accounting/:path*",
    "/sales/:path*",
    "/purchases/:path*",
    "/cash-bank/:path*",
    "/fixed-assets/:path*",
    "/tax/:path*",
    "/reports/:path*",
    "/deadlines/:path*",
    "/companies/:path*",
    "/settings/:path*",
    "/support/:path*",
    "/search/:path*",
    "/onboarding/:path*",
  ],
};
