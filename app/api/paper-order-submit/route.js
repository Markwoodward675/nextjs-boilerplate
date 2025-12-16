// app/api/paper-order-submit/route.js
import { NextResponse } from "next/server";
import { ID } from "appwrite";
import { getAdminClient } from "../../../lib/appwriteAdmin";

const ALLOWED_CURRENCIES = ["USD", "EUR", "JPY", "GBP"];
const ALLOWED_TYPES = [
  "deposit",
  "withdraw",
  "transfer",
  "refund",
  "invest",
  "trade",
  "giftcard_buy",
  "giftcard_sell",
  "admin_adjustment",
  "commission",
];

function bad(msg, status = 400) {
  return NextResponse.json({ ok: false, error: msg }, { status });
}

export async function POST(req) {
  try {
    const body = await req.json().catch(() => null);
    if (!body) return bad("Invalid JSON body.");

    const {
      userId,
      amount,
      currencyType = "USD",
      transactionType = "trade",
      status = "submitted",
      walletId = "trade",
      meta = {},
    } = body;

    if (!userId) return bad("Missing userId.");
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0) return bad("Invalid amount.");

    const cur = String(currencyType).toUpperCase();
    if (!ALLOWED_CURRENCIES.includes(cur)) return bad("Invalid currencyType. Use USD/EUR/JPY/GBP.");

    const tType = String(transactionType);
    if (!ALLOWED_TYPES.includes(tType)) return bad("Invalid transactionType.");

    const { db, DB_ID, COL } = getAdminClient();

    // Write transaction (enum-safe)
    const tx = await db.createDocument(DB_ID, COL.TX, ID.unique(), {
      transactionId: ID.unique(),
      userId: String(userId),
      walletId: String(walletId || "trade"),
      amount: amt,
      currencyType: cur, // enum
      transactionType: tType, // enum
      transactionDate: new Date().toISOString(), // datetime
      status: String(status || "submitted"),
      meta: JSON.stringify(meta || {}),
      type: tType,
    });

    // Also write an alert (enum-safe severity)
    await db.createDocument(DB_ID, COL.ALERTS, ID.unique(), {
      alertId: ID.unique(),
      alertTitle: "Trade Redirect Started",
      alertMessage: `Trade intent recorded for ${meta?.ticker || "asset"} — redirect prepared.`,
      severity: "low", // enum: low/medium/high/critical
      alertCategory: "trade",
      userId: String(userId),
      isResolved: false,
      title: "Trade Redirect Started",
      body: `Recorded trade intent. Asset: ${meta?.ticker || "-"} • Amount: ${amt} ${cur}`,
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json({ ok: true, txId: tx.$id });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e?.message || "Server error." },
      { status: 500 }
    );
  }
}
