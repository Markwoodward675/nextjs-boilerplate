// app/api/auth/me/route.js
import "server-only";
export const runtime = "nodejs";

import { NextResponse } from "next/server";

const ENDPOINT = process.env.APPWRITE_ENDPOINT || process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT;
const PROJECT_ID = process.env.APPWRITE_PROJECT_ID || process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;

export async function GET(req) {
  try {
    const cookie = req.headers.get("cookie") || "";
    const r = await fetch(`${ENDPOINT}/account`, {
      method: "GET",
      headers: { "x-appwrite-project": PROJECT_ID, cookie },
      cache: "no-store",
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) return NextResponse.json({ ok: false, error: data?.message || "Not signed in." }, { status: 401 });
    return NextResponse.json({ ok: true, user: data }, { status: 200 });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e?.message || "Not signed in." }, { status: 401 });
  }
}
