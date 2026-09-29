import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyAdminSession, COOKIE_NAME } from "./lib/auth";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Only protect /portal routes
  if (pathname.startsWith("/portal")) {
    // Allow the login page and login API
    if (pathname === "/portal/login" || pathname === "/api/portal/login") {
      return NextResponse.next();
    }

    const sessionToken = request.cookies.get(COOKIE_NAME)?.value;
    const isValid = await verifyAdminSession(sessionToken);

    if (!isValid) {
      const loginUrl = new URL("/portal/login", request.url);
      loginUrl.searchParams.set("from", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/portal/:path*"]
};
