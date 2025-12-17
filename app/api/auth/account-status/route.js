// app/api/auth/account-status/route.js
import "server-only";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { Query } from "node-appwrite";
import { getAdmin } from "../../../../lib/appwriteAdmin";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const email = String(searchParams.get("email") || "").trim().toLowerCase();
    if (!email) return NextResponse.json({ ok: false, error: "Missing email." }, { status: 400 });

    const { db, DATABASE_ID } = getAdmin();
    const PROFILES_COL = process.env.APPWRITE_PROFILES_COLLECTION_ID || "profiles";

    const r = await db.listDocuments(DATABASE_ID, PROFILES_COL, [
      Query.equal("email", email),
      Query.limit(1),
    ]);

    const p = r?.documents?.[0] || null;

    return NextResponse.json(
      {
        ok: true,
        exists: !!p,
        verified: !!p?.verificationCodeVerified,
        userId: p?.userId || p?.$id || null,
      },
      { status: 200 }
    );
  } catch (e) {
    return NextResponse.json({ ok: false, error: e?.message || "Status failed." }, { status: 500 });
  }
}
