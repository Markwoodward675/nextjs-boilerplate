// app/api/bootstrap/route.js
import "server-only";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getAdmin, ID, Query } from "../../../lib/appwriteAdmin";

const PROFILES_COL = process.env.APPWRITE_PROFILES_COLLECTION_ID || "profiles";
const WALLETS_COL = process.env.NEXT_PUBLIC_APPWRITE_WALLETS_COLLECTION_ID || "wallets";

export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const userId = String(body?.userId || "").trim();
    if (!userId) {
      return NextResponse.json({ ok: false, error: "Missing userId." }, { status: 400 });
    }

    const { db, users, DATABASE_ID } = getAdmin();
    const now = new Date().toISOString();

    // Trust admin users.get
    const u = await users.get(userId);
    const user = {
      $id: u?.$id,
      email: u?.email || "",
      name: u?.name || "",
      emailVerification: u?.emailVerification,
      $createdAt: u?.$createdAt,
      $updatedAt: u?.$updatedAt,
    };

    // Ensure profile doc (docId=userId)
    let profile = null;
    try {
      profile = await db.getDocument(DATABASE_ID, PROFILES_COL, userId);
    } catch {
      profile = await db.createDocument(DATABASE_ID, PROFILES_COL, userId, {
        userId,
        email: user.email,
        fullName: user.name || "",
        country: "",
        kycStatus: "not_submitted",
        verificationCodeVerified: false,
        createdAt: now,
      });
    }

    // Ensure wallets (create 3 only if none exist)
    try {
      const existing = await db.listDocuments(DATABASE_ID, WALLETS_COL, [
        Query.equal("userId", userId),
        Query.limit(50),
      ]);

      if (!existing?.documents?.length) {
        const makeWallet = async () =>
          db.createDocument(DATABASE_ID, WALLETS_COL, ID.unique(), {
            walletId: crypto.randomUUID(),
            userId,
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

    return NextResponse.json({ ok: true, user, profile }, { status: 200 });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e?.message || "Bootstrap failed." }, { status: 500 });
  }
}
