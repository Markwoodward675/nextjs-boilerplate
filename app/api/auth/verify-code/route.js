// app/api/auth/verify-code/route.js
import "server-only";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getAdminClient } from "../../../../lib/appwriteAdmin";

function json(status, body) {
  return NextResponse.json(body, { status });
}

export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const userId = String(body?.userId || "").trim();
    const code = String(body?.code || "").trim();

    if (!userId) return json(400, { ok: false, error: "Missing userId." });
    if (!/^\d{6}$/.test(code)) return json(400, { ok: false, error: "Code must be 6 digits." });

    const { db, users, DATABASE_ID } = getAdminClient();

    // Validate user exists + get email (helps user_profile creation if required)
    const u = await users.get(userId);
    const email = String(u?.email || "").trim();

    const VERIFY_COL =
      process.env.APPWRITE_VERIFY_CODES_COLLECTION_ID ||
      process.env.NEXT_PUBLIC_APPWRITE_VERIFY_CODES_COLLECTION_ID ||
      "verify_codes";

    const USER_PROFILE_COL =
      process.env.APPWRITE_USERS_COLLECTION_ID ||
      process.env.NEXT_PUBLIC_APPWRITE_USERS_COLLECTION_ID ||
      "user_profile";

    // 1) Load verify doc (docId=userId)
    const doc = await db.getDocument(DATABASE_ID, VERIFY_COL, userId);

    // Already used?
    if (doc?.used) {
      return json(400, { ok: false, error: "Code already used. Send a new one." });
    }

    // Code mismatch?
    if (String(doc?.code || "") !== code) {
      return json(400, { ok: false, error: "Invalid code." });
    }

    const nowIso = new Date().toISOString();

    // 2) Mark verify doc used
    await db.updateDocument(DATABASE_ID, VERIFY_COL, userId, {
      used: true,
      usedAt: nowIso, // verify_codes.usedAt is string in your schema
    });

    // 3) Upsert user_profile (single source of truth)
    // IMPORTANT: Only write fields that actually exist in your user_profile schema.
    // Do NOT write verifiedAt, displayName, etc.
    const patch = {
      verificationCodeVerified: true,
      updatedAt: nowIso,
      // keep consistent values if missing
      kycStatus: "not_submitted",
    };

    // Try update existing doc first
    try {
      await db.getDocument(DATABASE_ID, USER_PROFILE_COL, userId);
      await db.updateDocument(DATABASE_ID, USER_PROFILE_COL, userId, patch);
    } catch {
      // Create doc carefully. Some schemas require extra fields.
      // We include userId/email/role if present in your schema (role exists, email exists).
      const createPayload = {
        userId,
        email: email || null,
        role: "user",
        createdAt: nowIso,
        updatedAt: nowIso,
        verificationCodeVerified: true,
        kycStatus: "not_submitted",
      };

      // If your user_profile schema marks some of these as required,
      // this prevents "Invalid document structure" crashes.
      await db.createDocument(DATABASE_ID, USER_PROFILE_COL, userId, createPayload);
    }

    return json(200, { ok: true });
  } catch (e) {
    // Make Appwrite errors readable in UI
    const msg =
      String(e?.message || "")
        .replace(/^\[.*?\]\s*/g, "")
        .trim() || "Verify failed.";
    return json(500, { ok: false, error: msg });
  }
}
