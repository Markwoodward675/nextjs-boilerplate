import "server-only";
export const runtime = "nodejs";

import { NextResponse } from "next/server";

const ENDPOINT = process.env.APPWRITE_ENDPOINT || process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT;
const PROJECT_ID = process.env.APPWRITE_PROJECT_ID || process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;

export async function POST(req) {
  try {
    if (!ENDPOINT || !PROJECT_ID) {
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    const cookie = req.headers.get("cookie") || "";

    // Best-effort session deletion
    await fetch(`${ENDPOINT}/account/sessions/current`, {
      method: "DELETE",
      headers: {
        "x-appwrite-project": PROJECT_ID,
        cookie,
      },
      cache: "no-store",
    }).catch(() => null);

    const res = NextResponse.json({ ok: true }, { status: 200 });

    // Clear cookies (covers common names; Appwrite may set more than one)
    res.headers.append(
      "set-cookie",
      `a_session_${PROJECT_ID}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax`
    );
    res.headers.append(
      "set-cookie",
      `a_session_${PROJECT_ID}_legacy=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax`
    );

    return res;
  } catch {
    return NextResponse.json({ ok: true }, { status: 200 });
  }
}
