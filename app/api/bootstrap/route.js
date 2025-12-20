// app/api/bootstrap/route.js
import "server-only";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getAdmin, ID, Query } from "../../../lib/appwriteAdmin";

const ENDPOINT = process.env.APPWRITE_ENDPOINT || process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT;
const PROJECT_ID = process.env.APPWRITE_PROJECT_ID || process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;

const USER_PROFILE_COL =
  process.env.APPWRITE_USERS_COLLECTION_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_USERS_COLLECTION_ID ||
  "user_profile";

const WALLETS_COL =
  process.env.NEXT_PUBLIC_APPWRITE_WALLETS_COLLECTION_ID || "wallets";

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

export async function POST(req) {
  try {
    if (!ENDPOINT || !PROJECT_ID) {
      return NextResponse.json({ ok: false, error: "Appwrite not configured." }, { status: 500 });
    }

    const cookie = req.headers.get("cookie") || "";
    const me = await getAccount(cookie);

    const { db, DATABASE_ID } = getAdmin();
    const now = new Date().toISOString();

    // Ensure user_profile doc (docId = me.$id)
    let profile = null;
    try {
      profile = await db.getDocument(DATABASE_ID, USER_PROFILE_COL, me.$id);
    } catch {
      profile = await db.createDocument(DATABASE_ID, USER_PROFILE_COL, me.$id, {
        userId: me.$id,
        email: me.email,
        fullName: me.name || "",
        kycStatus: "not_submitted",
        verificationCodeVerified: false,
        createdAt: now,
        updatedAt: now,
      });
    }

    // Ensure wallets exist (3 basic). Ignore failure.
    try {
      const existing = await db.listDocuments(DATABASE_ID, WALLETS_COL, [
        Query.equal("userId", me.$id),
        Query.limit(50),
      ]);

      if (!existing?.documents?.length) {
        const makeWallet = async () =>
          db.createDocument(DATABASE_ID, WALLETS_COL, ID.unique(), {
            walletId: crypto.randomUUID(),
            userId: me.$id,
            currencyType: "USD",
            balance: 0,
            isActive: true,
            createdDate: now,
            updatedDate: now,
          });

        await makeWallet();
        await makeWallet();
        await makeWallet();
      }
    } catch {
      // ignore
    }

    return NextResponse.json(
      { ok: true, userId: me.$id, user: me, profile },
      { status: 200 }
    );
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e?.message || "Bootstrap failed." },
      { status: 401 }
    );
  }
}

export async function GET(req) {
  // Convenience if you ever GET it
  return POST(req);
}
