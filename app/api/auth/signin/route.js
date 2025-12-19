// app/api/auth/signin/route.js
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
    const email = String(body?.email || "").trim().toLowerCase();
    const password = String(body?.password || "");

    if (!email || !password) {
      return NextResponse.json({ ok: false, error: "Missing email or password." }, { status: 400 });
    }

    const cookie = req.headers.get("cookie") || "";

    // If a session exists, delete it (so signIn always works)
    await fetch(`${ENDPOINT}/account/sessions/current`, {
      method: "DELETE",
      headers: { "x-appwrite-project": PROJECT_ID, cookie },
      cache: "no-store",
    }).catch(() => null);

    // Create new session (REST)
    const r = await fetch(`${ENDPOINT}/account/sessions/email`, {
      method: "POST",
      headers: {
        "x-appwrite-project": PROJECT_ID,
        "content-type": "application/json",
      },
      body: JSON.stringify({ email, password }),
      cache: "no-store",
    });

    const data = await r.json().catch(() => ({}));
    if (!r.ok) {
      return NextResponse.json({ ok: false, error: data?.message || "Sign in failed." }, { status: r.status });
    }

    const res = NextResponse.json({ ok: true }, { status: 200 });
    const setCookie = r.headers.get("set-cookie");
    if (setCookie) res.headers.append("set-cookie", setCookie);
    return res;
  } catch (e) {
    return NextResponse.json({ ok: false, error: e?.message || "Sign in failed." }, { status: 500 });
  }
}
