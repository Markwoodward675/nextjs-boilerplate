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

function readBearer(req) {
  const auth = req.headers.get("authorization") || "";
  if (auth.toLowerCase().startsWith("bearer ")) return auth.slice(7).trim();
  return "";
}

async function getAccountByJWT(jwt) {
  const r = await fetch(`${ENDPOINT}/account`, {
    method: "GET",
    headers: {
      "x-appwrite-project": PROJECT_ID,
      "x-appwrite-jwt": jwt,
    },
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

    // ✅ JWT from client
    const jwt = readBearer(req);
    if (!jwt) {
      return NextResponse.json({ ok: false, error: "Unauthorized (missing JWT)." }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const claimedUserId = String(body?.userId || "").trim();

    // ✅ Verify JWT and get real user
    const me = await getAccountByJWT(jwt);
    if (claimedUserId && claimedUserId !== me.$id) {
      return NextResponse.json({ ok: false, error: "Unauthorized (user mismatch)." }, { status: 401 });
    }

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

    // Ensure 3 wallets (best-effort)
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
  return POST(req);
}
