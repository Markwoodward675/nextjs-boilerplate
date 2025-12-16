// app/api/deposit-submit/route.js
import { NextResponse } from "next/server";
import { getAdmin } from "../../../lib/appwriteAdmin";
import { ID } from "node-appwrite";

const COL_TX = "transactions";
const COL_ALERTS = "alerts";

export async function POST(req) {
  try {
    const { db, DATABASE_ID } = getAdmin();
    const body = await req.json();
    const { userId, walletId, amount, currencyType = "USD", method = "bank" } = body || {};

    if (!userId || !walletId) return NextResponse.json({ ok: false, error: "Missing userId/walletId." }, { status: 400 });
    if (!(Number(amount) > 0)) return NextResponse.json({ ok: false, error: "Invalid amount." }, { status: 400 });

    const tx = await db.createDocument(DATABASE_ID, COL_TX, ID.unique(), {
      transactionId: crypto.randomUUID(),
      userId,
      walletId,
      amount: Number(amount),
      currencyType,
      transactionType: "deposit",
      transactionDate: new Date().toISOString(),
      status: "pending",
      meta: JSON.stringify({ method }),
      type: "deposit",
    });

    await db.createDocument(DATABASE_ID, COL_ALERTS, ID.unique(), {
      alertId: crypto.randomUUID().slice(0, 12),
      alertTitle: "Deposit submitted",
      alertMessage: `Deposit request submitted (${method}).`,
      severity: "info",
      userId,
      isResolved: false,
      title: "Deposit submitted",
      body: `Deposit request submitted (${method}).`,
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json({ ok: true, tx });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e?.message || "Server error" }, { status: 500 });
  }
}
