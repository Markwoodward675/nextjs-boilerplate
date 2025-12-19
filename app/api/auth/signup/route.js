// app/api/auth/signup/route.js
import "server-only";
export const runtime = "nodejs";

import { NextResponse } from "next/server";

const ENDPOINT = process.env.APPWRITE_ENDPOINT || process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT;
const PROJECT_ID = process.env.APPWRITE_PROJECT_ID || process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;

export async function POST(req) {
  try {
    if (!ENDPOINT || !PROJECT_ID) {
      return NextResponse.json({ ok: false, error: "Appwrite not configured." }, { status: 500 });
    }

    const body = await req.json().catch(() => ({}));
    const fullName = String(body?.fullName || "").trim();
    const email = String(body?.email || "").trim().toLowerCase();
    const password = String(body?.password || "");

    if (!fullName || !email || !password) {
      return NextResponse.json({ ok: false, error: "Missing full name, email, or password." }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json({ ok: false, error: "Password must be at least 8 characters." }, { status: 400 });
    }

    // Create account (REST supports userId = "unique()")
    const r = await fetch(`${ENDPOINT}/account`, {
      method: "POST",
      headers: {
        "x-appwrite-project": PROJECT_ID,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        userId: "unique()",
        email,
        password,
        name: fullName,
      }),
      cache: "no-store",
    });

    const data = await r.json().catch(() => ({}));
    if (!r.ok) {
      return NextResponse.json({ ok: false, error: data?.message || "Sign up failed." }, { status: r.status });
    }

    // Auto sign-in
    const s = await fetch(`${ENDPOINT}/account/sessions/email`, {
      method: "POST",
      headers: {
        "x-appwrite-project": PROJECT_ID,
        "content-type": "application/json",
      },
      body: JSON.stringify({ email, password }),
      cache: "no-store",
    });

    const sData = await s.json().catch(() => ({}));
    if (!s.ok) {
      // account created but login failed
      return NextResponse.json({ ok: false, error: sData?.message || "Account created, but sign-in failed." }, { status: s.status });
    }

    const res = NextResponse.json({ ok: true }, { status: 200 });
    const setCookie = s.headers.get("set-cookie");
    if (setCookie) res.headers.append("set-cookie", setCookie);
    return res;
  } catch (e) {
    return NextResponse.json({ ok: false, error: e?.message || "Sign up failed." }, { status: 500 });
  }
}
