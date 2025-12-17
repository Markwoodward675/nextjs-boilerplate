import "server-only";
export const runtime = "nodejs";

import { NextResponse } from "next/server";

const ENDPOINT = process.env.APPWRITE_ENDPOINT || process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT;
const PROJECT_ID = process.env.APPWRITE_PROJECT_ID || process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;

function jsonError(message, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const email = String(body?.email || "").trim().toLowerCase();
    const password = String(body?.password || "");

    if (!ENDPOINT || !PROJECT_ID) return jsonError("Appwrite is not configured.", 500);
    if (!email) return jsonError("Missing email.");
    if (!password) return jsonError("Missing password.");

    const r = await fetch(`${ENDPOINT}/account/sessions/email`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-appwrite-project": PROJECT_ID,
      },
      body: JSON.stringify({ email, password }),
      cache: "no-store",
    });

    const data = await r.json().catch(() => ({}));
    if (!r.ok) return jsonError(data?.message || data?.error || "Sign in failed.", r.status);

    const res = NextResponse.json({ ok: true, user: data }, { status: 200 });

    // Forward ALL set-cookie headers (Appwrite sets session cookies here)
    const cookies = r.headers.getSetCookie?.() || [];
    if (cookies.length) {
      for (const c of cookies) res.headers.append("set-cookie", c);
    } else {
      const sc = r.headers.get("set-cookie");
      if (sc) res.headers.append("set-cookie", sc);
    }

    return res;
  } catch (e) {
    return jsonError(e?.message || "Unable to sign in.", 500);
  }
}
