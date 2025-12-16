// app/api/claim-signup-bonus/route.js
import { NextResponse } from "next/server";
import { getAdmin } from "../../../lib/appwriteAdmin";
import { ID, Query } from "node-appwrite";

const COL_TX = "transactions";
const COL_ALERTS = "alerts";

export async function POST(req) {
  try {
    const { db, DATABASE_ID } = getAdmin();
    const body = await req.json();
    const { userId, walletId } = body || {};

    if (!userId || !walletId) return NextResponse.json({ ok: false, error: "Missing userId/walletId." }, { status: 400 });

    // prevent double-claim: look for existing tx type "signup_bonus"
    const existing = await db.listDocuments(DATABASE_ID, COL_TX, [
      Query.equal("userId", userId),
      Query.equal("type", "signup_bonus"),
      Query.limit(1),
    ]);

    if (existing?.documents?.length) {
      return NextResponse.json({ ok: false, error: "Signup bonus already claimed." }, { status: 400 });
    }

    const tx = await db.createDocument(DATABASE_ID, COL_TX, ID.unique(), {
      transactionId: crypto.randomUUID(),
      userId,
      walletId,
      amount: 100,
      currencyType: "USD",
      transactionType: "airdrop",
      transactionDate: new Date().toISOString(),
      status: "approved",
      meta: JSON.stringify({ reason: "signup_bonus" }),
      type: "signup_bonus",
    });

    await db.createDocument(DATABASE_ID, COL_ALERTS, ID.unique(), {
      alertId: crypto.randomUUID().slice(0, 12),
      alertTitle: "Signup bonus claimed",
      alertMessage: "Your signup bonus has been credited.",
      severity: "info",
      userId,
      isResolved: false,
      title: "Signup bonus claimed",
      body: "Your signup bonus has been credited.",
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json({ ok: true, tx });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e?.message || "Server error" }, { status: 500 });
  }
}
