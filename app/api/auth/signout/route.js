// app/api/auth/signout/route.js
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
    if (!ENDPOINT || !PROJECT_ID) {
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    const cookie = req.headers.get("cookie") || "";

    const r = await fetch(`${ENDPOINT}/account/sessions/current`, {
      method: "DELETE",
      headers: { "x-appwrite-project": PROJECT_ID, cookie },
      cache: "no-store",
    });

    const out = NextResponse.json({ ok: true }, { status: 200 });
    appendSetCookies(r, out);
    return out;
  } catch {
    return NextResponse.json({ ok: true }, { status: 200 });
  }
}
