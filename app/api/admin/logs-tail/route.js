import { NextResponse } from "next/server";
import { getAdmin, requireAdminAuth } from "../../../../lib/appwriteAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req) {
  try {
    requireAdminAuth(req);
    const { db, DATABASE_ID, Query } = getAdmin();

    const [a, t] = await Promise.all([
      db.listDocuments(DATABASE_ID, "alerts", [
        Query.orderDesc("$createdAt"),
        Query.limit(25),
      ]),
      db.listDocuments(DATABASE_ID, "transactions", [
        Query.orderDesc("$createdAt"),
        Query.limit(25),
      ]),
    ]);

    const lines = [];

    lines.push("=== ALERTS (latest 25) ===");
    for (const x of a?.documents || []) {
      lines.push(
        `[${x.$createdAt}] [${x.severity}] userId=${x.userId} :: ${x.title || x.alertTitle} — ${x.body || x.alertMessage}`
      );
    }

    lines.push("");
    lines.push("=== TRANSACTIONS (latest 25) ===");
    for (const x of t?.documents || []) {
      lines.push(
        `[${x.$createdAt}] userId=${x.userId} :: ${x.transactionType} ${x.amount} ${x.currencyType} walletId=${x.walletId} status=${x.status || "—"}`
      );
    }

    return NextResponse.json({ text: lines.join("\n") });
  } catch (e) {
    return NextResponse.json(
      { error: e?.message || "Failed to load logs tail." },
      { status: e?.status || 500 }
    );
  }
}
