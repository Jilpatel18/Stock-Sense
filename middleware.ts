import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

function getJwtSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  return new TextEncoder().encode(secret || "stocksense_super_secret_jwt_key_2026_dev_fallback");
}

const PUBLIC_PATH_PREFIXES = [
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
  "/_next",
  "/api",
  "/favicon.ico",
  "/scratch",
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Exact public root landing page
  if (pathname === "/") {
    return NextResponse.next();
  }

  // Check if pathname starts with any public prefix
  const isPublicPath = PUBLIC_PATH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(prefix + "/")
  );

  if (isPublicPath) {
    return NextResponse.next();
  }

  // Protected route check
  const token = request.cookies.get("stocksense_session")?.value;

  let isAuthenticated = false;
  if (token) {
    try {
      await jwtVerify(token, getJwtSecret());
      isAuthenticated = true;
    } catch {
      isAuthenticated = false;
    }
  }

  if (!isAuthenticated) {
    const loginUrl = new URL("/login", request.url);
    // Sanitize pathname to prevent open redirect
    if (pathname.startsWith("/") && !pathname.startsWith("//")) {
      loginUrl.searchParams.set("redirect", pathname);
    }
    const response = NextResponse.redirect(loginUrl);
    // Add cache control to prevent browser back button caching protected content
    response.headers.set("Cache-Control", "no-store, max-age=0, must-revalidate");
    return response;
  }

  const response = NextResponse.next();
  response.headers.set("Cache-Control", "no-store, max-age=0, must-revalidate");
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
