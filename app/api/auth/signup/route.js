// app/api/auth/signup/route.js
import "server-only";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getAdminClient } from "../../../../lib/appwriteAdmin";

const ENDPOINT = process.env.APPWRITE_ENDPOINT || process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT;
const PROJECT_ID = process.env.APPWRITE_PROJECT_ID || process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;

const USER_PROFILE_COL =
  process.env.APPWRITE_USERS_COLLECTION_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_USERS_COLLECTION_ID ||
  "user_profile";

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
    const body = await req.json().catch(() => ({}));
    const fullName = String(body?.fullName || "").trim();
    const email = String(body?.email || "").trim().toLowerCase();
    const password = String(body?.password || "");

    if (!fullName) return NextResponse.json({ ok: false, error: "Full name is required." }, { status: 400 });
    if (!email) return NextResponse.json({ ok: false, error: "Email is required." }, { status: 400 });
    if (password.length < 8) return NextResponse.json({ ok: false, error: "Password must be at least 8 characters." }, { status: 400 });

    if (!ENDPOINT || !PROJECT_ID) {
      return NextResponse.json({ ok: false, error: "Appwrite not configured." }, { status: 500 });
    }

    // 1) Create account (public endpoint)
    const createRes = await fetch(`${ENDPOINT}/account`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-appwrite-project": PROJECT_ID },
      body: JSON.stringify({ userId: "unique()", email, password, name: fullName }),
      cache: "no-store",
    });

    const created = await createRes.json().catch(() => ({}));
    if (!createRes.ok) {
      return NextResponse.json({ ok: false, error: created?.message || "Signup failed." }, { status: createRes.status });
    }

    // 2) Create session (public endpoint)
    const sessRes = await fetch(`${ENDPOINT}/account/sessions/email`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-appwrite-project": PROJECT_ID },
      body: JSON.stringify({ email, password }),
      cache: "no-store",
    });

    const sess = await sessRes.json().catch(() => ({}));
    if (!sessRes.ok) {
      return NextResponse.json({ ok: false, error: sess?.message || "Unable to create session." }, { status: sessRes.status });
    }

    // 3) Ensure user_profile exists (admin DB, docId=userId)
    try {
      const { db, DATABASE_ID } = getAdminClient();
      const now = new Date().toISOString();

      try {
        await db.getDocument(DATABASE_ID, USER_PROFILE_COL, created?.$id);
      } catch {
        await db.createDocument(DATABASE_ID, USER_PROFILE_COL, created?.$id, {
          userId: created?.$id,
          email,
          fullName,
          kycStatus: "not_submitted",
          verificationCodeVerified: false,
          countryLocked: false,
          createdAt: now,
          updatedAt: now,
        });
      }
    } catch {
      // ignore profile bootstrap; /api/bootstrap will fix it later
    }

    const out = NextResponse.json({ ok: true }, { status: 200 });
    appendSetCookies(sessRes, out); // forward session cookies
    return out;
  } catch (e) {
    return NextResponse.json({ ok: false, error: e?.message || "Signup failed." }, { status: 500 });
  }
}
