import { NextResponse } from "next/server";

const CANONICAL_HOST = "www.matthewsandclark.co.za";
const SITE_HOST = "site.matthewsandclark.co.za";

export function middleware(request) {
  const url = request.nextUrl;
  const host = (request.headers.get("x-forwarded-host") || request.headers.get("host") || "").toLowerCase();

  // Don't redirect API/routes used by webhooks; those can be configured explicitly.
  if (url.pathname.startsWith("/api")) return NextResponse.next();

  // Allow local dev.
  if (host.includes("localhost") || host.includes("127.0.0.1")) {
    // Handle site.localhost subdomain in local dev
    if (host.startsWith("site.")) {
      const pathname = url.pathname === "/" ? "/mc-site" : `/mc-site${url.pathname}`;
      const rewritten = url.clone();
      rewritten.pathname = pathname;
      return NextResponse.rewrite(rewritten);
    }
    // Block direct access to /mc-site/* on non-site hosts
    if (url.pathname.startsWith("/mc-site")) {
      const home = url.clone();
      home.pathname = "/";
      return NextResponse.redirect(home);
    }
    return NextResponse.next();
  }

  // Detect site subdomain — rewrite to /mc-site route group
  if (host === SITE_HOST) {
    const pathname = url.pathname === "/" ? "/mc-site" : `/mc-site${url.pathname}`;
    const rewritten = url.clone();
    rewritten.pathname = pathname;
    return NextResponse.rewrite(rewritten);
  }

  // Block direct access to /mc-site/* on the main domain
  if (url.pathname.startsWith("/mc-site")) {
    const next = url.clone();
    next.protocol = "https:";
    next.host = CANONICAL_HOST;
    next.pathname = "/";
    return NextResponse.redirect(next, 308);
  }

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
