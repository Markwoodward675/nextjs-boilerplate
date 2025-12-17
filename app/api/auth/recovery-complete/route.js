import "server-only";
export const runtime = "nodejs";

import { NextResponse } from "next/server";

const ENDPOINT = process.env.APPWRITE_ENDPOINT || process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT;
const PROJECT_ID = process.env.APPWRITE_PROJECT_ID || process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;

export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const userId = String(body?.userId || "").trim();
    const secret = String(body?.secret || "").trim();
    const password = String(body?.password || "");

    if (!userId) return NextResponse.json({ ok: false, error: "Missing userId." }, { status: 400 });
    if (!secret) return NextResponse.json({ ok: false, error: "Missing secret." }, { status: 400 });
    if (!password || password.length < 8) {
      return NextResponse.json({ ok: false, error: "Password must be at least 8 characters." }, { status: 400 });
    }

    const r = await fetch(`${ENDPOINT}/account/recovery`, {
      method: "PUT",
      headers: {
        "content-type": "application/json",
        "x-appwrite-project": PROJECT_ID,
      },
      body: JSON.stringify({
        userId,
        secret,
        password,
        passwordAgain: password,
      }),
      cache: "no-store",
    });

    const data = await r.json().catch(() => ({}));
    if (!r.ok) {
      return NextResponse.json({ ok: false, error: data?.message || "Reset failed." }, { status: r.status });
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e?.message || "Reset failed." }, { status: 500 });
  }
}
