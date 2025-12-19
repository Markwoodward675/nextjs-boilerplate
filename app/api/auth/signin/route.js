// app/api/auth/signin/route.js
import "server-only";
export const runtime = "nodejs";

import { NextResponse } from "next/server";

const ENDPOINT = process.env.APPWRITE_ENDPOINT || process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT;
const PROJECT_ID = process.env.APPWRITE_PROJECT_ID || process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;

function appendSetCookies(fromRes, toRes) {
  const setCookies =
    (fromRes.headers.getSetCookie && fromRes.headers.getSetCookie()) ||
    (fromRes.headers.get("set-cookie") ? [fromRes.headers.get("set-cookie")] : []);

  for (const c of setCookies) {
    if (c) toRes.headers.append("set-cookie", c);
  }
}

export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const email = String(body?.email || "").trim().toLowerCase();
    const password = String(body?.password || "");

    if (!email || !password) {
      return NextResponse.json({ ok: false, error: "Email and password are required." }, { status: 400 });
    }
    if (!ENDPOINT || !PROJECT_ID) {
      return NextResponse.json({ ok: false, error: "Appwrite not configured." }, { status: 500 });
    }

    const cookie = req.headers.get("cookie") || "";

    // HARDFIX: delete current session first (prevents: “session is active”)
    await fetch(`${ENDPOINT}/account/sessions/current`, {
      method: "DELETE",
      headers: { "x-appwrite-project": PROJECT_ID, cookie },
      cache: "no-store",
    }).catch(() => {});

    // Create fresh session
    const sessRes = await fetch(`${ENDPOINT}/account/sessions/email`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-appwrite-project": PROJECT_ID },
      body: JSON.stringify({ email, password }),
      cache: "no-store",
    });

    const data = await sessRes.json().catch(() => ({}));
    if (!sessRes.ok) {
      return NextResponse.json({ ok: false, error: data?.message || "Sign in failed." }, { status: sessRes.status });
    }

    const out = NextResponse.json({ ok: true }, { status: 200 });
    appendSetCookies(sessRes, out);
    return out;
  } catch (e) {
    return NextResponse.json({ ok: false, error: e?.message || "Sign in failed." }, { status: 500 });
  }
}
