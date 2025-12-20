// app/api/bootstrap/route.js
import "server-only";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getAdminClient, ID, Query } from "@/lib/appwriteAdmin";

const ENDPOINT = process.env.APPWRITE_ENDPOINT || process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT;
const PROJECT_ID = process.env.APPWRITE_PROJECT_ID || process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;

// Single source of truth
const USER_PROFILE_COL =
  process.env.APPWRITE_USERS_COLLECTION_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_USERS_COLLECTION_ID ||
  "user_profile";

const WALLETS_COL =
  process.env.APPWRITE_WALLETS_COLLECTION_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_WALLETS_COLLECTION_ID ||
  "wallets";

async function getAccount(cookie) {
  const r = await fetch(`${ENDPOINT}/account`, {
    method: "GET",
    headers: { "x-appwrite-project": PROJECT_ID, cookie },
    cache: "no-store",
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data?.message || "Not signed in.");
  return data;
}

async function upsertProfile(db, DATABASE_ID, me) {
  // Write only safe fields (avoid “Unknown attribute” again)
  const base = {
    userId: me.$id,
    email: me.email,
    fullName: me.name || "",
    verificationCodeVerified: false,
    kycStatus: "not_submitted",
  };

  try {
    const doc = await db.getDocument(DATABASE_ID, USER_PROFILE_COL, me.$id);
    // keep existing verified flag if already verified
    const verified = Boolean(doc?.verificationCodeVerified);
    const next = { ...base, verificationCodeVerified: verified };
    await db.updateDocument(DATABASE_ID, USER_PROFILE_COL, me.$id, next);
    return await db.getDocument(DATABASE_ID, USER_PROFILE_COL, me.$id);
  } catch {
    await db.createDocument(DATABASE_ID, USER_PROFILE_COL, me.$id, base);
    return await db.getDocument(DATABASE_ID, USER_PROFILE_COL, me.$id);
  }
}

export async function GET(req) {
  try {
    if (!ENDPOINT || !PROJECT_ID) {
      return NextResponse.json({ ok: false, error: "Appwrite not configured." }, { status: 500 });
    }

    const cookie = req.headers.get("cookie") || "";
    const me = await getAccount(cookie);

    const { db, DATABASE_ID } = getAdminClient();

    const profile = await upsertProfile(db, DATABASE_ID, me);

    // Wallet bootstrap is best-effort (won’t block app)
    try {
      const existing = await db.listDocuments(DATABASE_ID, WALLETS_COL, [
        Query.equal("userId", me.$id),
        Query.limit(10),
      ]);

      if (!existing?.documents?.length) {
        await db.createDocument(DATABASE_ID, WALLETS_COL, ID.unique(), {
          userId: me.$id,
          kind: "main",
          balance: 0,
        });
        await db.createDocument(DATABASE_ID, WALLETS_COL, ID.unique(), {
          userId: me.$id,
          kind: "trading",
          balance: 0,
        });
        await db.createDocument(DATABASE_ID, WALLETS_COL, ID.unique(), {
          userId: me.$id,
          kind: "affiliate",
          balance: 0,
        });
      }
    } catch {
      // ignore
    }

    return NextResponse.json(
      { ok: true, me, user: me, userId: me.$id, profile },
      { status: 200 }
    );
  } catch (e) {
    return NextResponse.json({ ok: false, error: e?.message || "Bootstrap failed." }, { status: 401 });
  }
}
