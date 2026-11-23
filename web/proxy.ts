import { type NextRequest, NextResponse } from "next/server";

import { AUTH_COOKIE, tokenFor } from "./lib/auth";

/** When SITE_PASSWORD is set, every page and API call needs the password cookie. */
export async function proxy(req: NextRequest) {
  const password = process.env.SITE_PASSWORD;
  if (!password) return NextResponse.next();
  if (req.cookies.get(AUTH_COOKIE)?.value === (await tokenFor(password))) return NextResponse.next();

  if (req.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Please sign in again.", code: "auth" }, { status: 401 });
  }
  const login = new URL("/login", req.url);
  login.searchParams.set("next", req.nextUrl.pathname + req.nextUrl.search);
  return NextResponse.redirect(login);
}

export const config = {
  matcher: ["/((?!login|api/login|_next/static|_next/image|favicon.ico|icon.svg|manifest.webmanifest).*)"],
};
