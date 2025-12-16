import { NextResponse } from "next/server";
import { getAdmin } from "../../../../lib/appwriteAdmin";
import { ID } from "node-appwrite";

const COL_TX = "transactions";
const COL_ALERTS = "alerts";

export async function POST(req) {
  try {
    const { db, DATABASE_ID } = getAdmin();
    const body = await req.json();
    const { userId, amount, plan, roiRate, durationDays = 30 } = body || {};

    if (!userId) return NextResponse.json({ ok: false, error: "Missing userId." }, { status: 400 });
    if (!(Number(amount) > 0)) return NextResponse.json({ ok: false, error: "Invalid amount." }, { status: 400 });

    const meta = { plan, roiRate: Number(roiRate), durationDays: Number(durationDays) };

    const tx = await db.createDocument(DATABASE_ID, COL_TX, ID.unique(), {
      transactionId: crypto.randomUUID(),
      userId,
      walletId: crypto.randomUUID(), // adjust if you have a dedicated invest walletId
      amount: Number(amount),
      currencyType: "USD",
      transactionType: "invest",
      transactionDate: new Date().toISOString(),
      status: "active",
      meta: JSON.stringify(meta),
      type: "invest",
    });

    await db.createDocument(DATABASE_ID, COL_ALERTS, ID.unique(), {
      alertId: crypto.randomUUID().slice(0, 12),
      alertTitle: "Investment started",
      alertMessage: `Plan: ${plan}. Amount: $${Number(amount).toLocaleString()}`,
      severity: "info",
      userId,
      isResolved: false,
      title: "Investment started",
      body: `Plan: ${plan}. Amount: $${Number(amount).toLocaleString()}`,
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json({ ok: true, tx });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e?.message || "Server error" }, { status: 500 });
  }
}
