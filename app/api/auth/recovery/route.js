// app/api/auth/recovery/route.js
import "server-only";
export const runtime = "nodejs";

import { NextResponse } from "next/server";

const ENDPOINT = process.env.APPWRITE_ENDPOINT || process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT;
const PROJECT_ID = process.env.APPWRITE_PROJECT_ID || process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;

function getRecoveryUrl() {
  const base = (process.env.NEXT_PUBLIC_APP_URL || "").trim().replace(/\/+$/, "");
  if (!base) return "";
  return `${base}/reset-password`;
}

export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const email = String(body?.email || "").trim().toLowerCase();
    if (!email) return NextResponse.json({ ok: false, error: "Missing email." }, { status: 400 });

    const url = getRecoveryUrl();
    if (!url || !/^https?:\/\//i.test(url)) {
      return NextResponse.json(
        { ok: false, error: "Invalid recovery redirect URL. Set NEXT_PUBLIC_APP_URL to your full site URL." },
        { status: 500 }
      );
    }

    const r = await fetch(`${ENDPOINT}/account/recovery`, {
      method: "POST",
      headers: {
        "x-appwrite-project": PROJECT_ID,
        "content-type": "application/json",
      },
      body: JSON.stringify({ email, url }),
      cache: "no-store",
    });

    const data = await r.json().catch(() => ({}));
    if (!r.ok) return NextResponse.json({ ok: false, error: data?.message || "Recovery failed." }, { status: r.status });

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e?.message || "Recovery failed." }, { status: 500 });
  }
}
