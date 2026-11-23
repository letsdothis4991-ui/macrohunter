import { timingSafeEqual } from "node:crypto";

import { NextResponse } from "next/server";

import { AUTH_COOKIE, tokenFor } from "~/lib/auth";

export async function POST(req: Request) {
  const password = process.env.SITE_PASSWORD;
  if (!password) return NextResponse.json({ ok: true });
  const { password: given } = (await req.json().catch(() => ({}))) as { password?: string };
  const a = Buffer.from(await tokenFor(given ?? ""));
  const b = Buffer.from(await tokenFor(password));
  if (!given || !timingSafeEqual(a, b)) {
    await new Promise((r) => setTimeout(r, 600)); // slow down guessing
    return NextResponse.json({ error: "That password isn't right." }, { status: 401 });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set(AUTH_COOKIE, await tokenFor(password), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 90,
  });
  return res;
}
