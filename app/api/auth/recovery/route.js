import "server-only";
export const runtime = "nodejs";

import { NextResponse } from "next/server";

const ENDPOINT = process.env.APPWRITE_ENDPOINT || process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT;
const PROJECT_ID = process.env.APPWRITE_PROJECT_ID || process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;

export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const email = String(body?.email || "").trim().toLowerCase();
    if (!email) return NextResponse.json({ ok: false, error: "Missing email." }, { status: 400 });

    if (!ENDPOINT || !PROJECT_ID) {
      return NextResponse.json({ ok: false, error: "Appwrite not configured." }, { status: 500 });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin;
    const redirectUrl = `${appUrl.replace(/\/$/, "")}/reset-password`;

    const r = await fetch(`${ENDPOINT}/account/recovery`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-appwrite-project": PROJECT_ID,
      },
      body: JSON.stringify({ email, url: redirectUrl }),
      cache: "no-store",
    });

    const data = await r.json().catch(() => ({}));
    if (!r.ok) {
      return NextResponse.json(
        { ok: false, error: data?.message || "Recovery failed." },
        { status: r.status }
      );
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e?.message || "Recovery failed." }, { status: 500 });
  }
}
