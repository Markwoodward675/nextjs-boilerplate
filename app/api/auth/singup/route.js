import "server-only";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getAdmin, ID, Query } from "../../../../lib/appwriteAdmin";

const ENDPOINT = process.env.APPWRITE_ENDPOINT || process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT;
const PROJECT_ID = process.env.APPWRITE_PROJECT_ID || process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;

const PROFILES_COL = process.env.APPWRITE_PROFILES_COLLECTION_ID || "profiles";

function jsonError(message, status = 400, extra = {}) {
  return NextResponse.json({ ok: false, error: message, ...extra }, { status });
}

async function createSession(email, password) {
  const r = await fetch(`${ENDPOINT}/account/sessions/email`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-appwrite-project": PROJECT_ID },
    body: JSON.stringify({ email, password }),
    cache: "no-store",
  });
  return r;
}

export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const fullName = String(body?.fullName || "").trim();
    const email = String(body?.email || "").trim().toLowerCase();
    const password = String(body?.password || "");

    if (!ENDPOINT || !PROJECT_ID) return jsonError("Appwrite is not configured.", 500);
    if (!fullName) return jsonError("Missing fullName.");
    if (!email) return jsonError("Missing email.");
    if (!password) return jsonError('Missing required parameter: "password"');
    if (password.length < 8) return jsonError("Password must be at least 8 characters.");

    const { users, db, DATABASE_ID } = getAdmin();

    let createdUser = null;

    try {
      createdUser = await users.create(ID.unique(), email, undefined, password, fullName);
    } catch (e) {
      const msg = String(e?.message || "");
      const isConflict = /already exists/i.test(msg) || String(e?.code) === "409";

      if (!isConflict) return jsonError(msg || "Unable to create account.", 500);

      // If user exists, check if verified (via profiles collection)
      let verified = false;
      try {
        const docs = await db.listDocuments(DATABASE_ID, PROFILES_COL, [
          Query.equal("email", email),
          Query.limit(1),
        ]);
        verified = !!docs?.documents?.[0]?.verificationCodeVerified;
      } catch {
        verified = false;
      }

      return jsonError("USER_EXISTS", 409, { verified });
    }

    // Ensure profile doc exists (docId = userId) for your required fields
    const now = new Date().toISOString();
    try {
      await db.createDocument(DATABASE_ID, PROFILES_COL, createdUser.$id, {
        userId: createdUser.$id,
        email,
        fullName,
        verificationCodeVerified: false,
        createdAt: now,
      });
    } catch {
      // ignore if already exists
    }

    // Create session cookies server-side (avoids browser CORS)
    const sessionRes = await createSession(email, password);
    const sessionJson = await sessionRes.json().catch(() => ({}));
    if (!sessionRes.ok) {
      return jsonError(sessionJson?.message || "Account created, but sign-in failed.", sessionRes.status);
    }

    const res = NextResponse.json({ ok: true, user: createdUser }, { status: 200 });

    const cookies = sessionRes.headers.getSetCookie?.() || [];
    if (cookies.length) {
      for (const c of cookies) res.headers.append("set-cookie", c);
    } else {
      const sc = sessionRes.headers.get("set-cookie");
      if (sc) res.headers.append("set-cookie", sc);
    }

    return res;
  } catch (e) {
    return jsonError(e?.message || "Unable to create account.", 500);
  }
}
