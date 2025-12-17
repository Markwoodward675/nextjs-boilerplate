import "server-only";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getAdmin, ID, Query } from "../../../lib/appwriteAdmin";

const ENDPOINT = process.env.APPWRITE_ENDPOINT || process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT;
const PROJECT_ID = process.env.APPWRITE_PROJECT_ID || process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;

const PROFILES_COL = process.env.APPWRITE_PROFILES_COLLECTION_ID || "profiles";
const WALLETS_COL = process.env.NEXT_PUBLIC_APPWRITE_WALLETS_COLLECTION_ID || "wallets";

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

export async function GET(req) {
  try {
    if (!ENDPOINT || !PROJECT_ID) {
      return NextResponse.json({ ok: false, error: "Appwrite not configured." }, { status: 500 });
    }

    const cookie = req.headers.get("cookie") || "";
    const user = await getAccount(cookie);

    const { db, DATABASE_ID } = getAdmin();
    const now = new Date().toISOString();

    // Ensure profile doc
    let profile = null;
    try {
      profile = await db.getDocument(DATABASE_ID, PROFILES_COL, user.$id);
    } catch {
      profile = await db.createDocument(DATABASE_ID, PROFILES_COL, user.$id, {
        userId: user.$id,
        email: user.email,
        fullName: user.name || "",
        verificationCodeVerified: false,
        createdAt: now,
      });
    }

    // Ensure wallets (3 basic)
    try {
      const existing = await db.listDocuments(DATABASE_ID, WALLETS_COL, [
        Query.equal("userId", user.$id),
        Query.limit(50),
      ]);

      if (!existing?.documents?.length) {
        const makeWallet = async () =>
          db.createDocument(DATABASE_ID, WALLETS_COL, ID.unique(), {
            walletId: crypto.randomUUID(),
            userId: user.$id,
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
      // ignore wallet bootstrap failures; pages can still render
    }

    return NextResponse.json({ ok: true, user, profile }, { status: 200 });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e?.message || "Bootstrap failed." }, { status: 401 });
  }
}
