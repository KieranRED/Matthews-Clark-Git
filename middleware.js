import { NextResponse } from "next/server";

const CANONICAL_HOST = "www.matthewsandclark.co.za";

export function middleware(request) {
  const url = request.nextUrl;
  const host = (request.headers.get("x-forwarded-host") || request.headers.get("host") || "").toLowerCase();

  // Don't redirect API/routes used by webhooks; those can be configured explicitly.
  if (url.pathname.startsWith("/api")) return NextResponse.next();

  // Allow local dev.
  if (host.includes("localhost") || host.includes("127.0.0.1")) return NextResponse.next();

  // If we hit a non-canonical host, redirect to the live domain.
  if (host && host !== CANONICAL_HOST) {
    const next = url.clone();
    next.protocol = "https:";
    next.host = CANONICAL_HOST;
    return NextResponse.redirect(next, 308);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/|favicon.ico|icons/|apple-touch-icon|manifest.webmanifest).*)"]
};

