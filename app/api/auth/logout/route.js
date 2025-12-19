// app/api/auth/logout/route.js
import "server-only";
export const runtime = "nodejs";

import { NextResponse } from "next/server";

const ENDPOINT = process.env.APPWRITE_ENDPOINT || process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT;
const PROJECT_ID = process.env.APPWRITE_PROJECT_ID || process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;

export async function POST(req) {
  try {
    const cookie = req.headers.get("cookie") || "";
    await fetch(`${ENDPOINT}/account/sessions/current`, {
      method: "DELETE",
      headers: { "x-appwrite-project": PROJECT_ID, cookie },
      cache: "no-store",
    }).catch(() => null);

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e?.message || "Logout failed." }, { status: 500 });
  }
}
