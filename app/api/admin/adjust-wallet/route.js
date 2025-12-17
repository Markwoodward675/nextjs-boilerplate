import { NextResponse } from "next/server";
import { getAdmin, requireAdminKey } from "@/lib/appwriteAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req) {
  try {
    requireAdminKey(req);
    const { db, DATABASE_ID, ID, Query } = getAdmin();

    const body = await req.json().catch(() => ({}));
    const userId = String(body?.userId || "").trim();
    const walletId = String(body?.walletId || "").trim();
    const amount = Number(body?.amount);

    if (!userId) return NextResponse.json({ error: "Missing userId." }, { status: 400 });
    if (!walletId) return NextResponse.json({ error: "Missing walletId." }, { status: 400 });
    if (!Number.isFinite(amount) || amount === 0) {
      return NextResponse.json({ error: "Invalid amount." }, { status: 400 });
    }

    // Find wallet doc by walletId + userId
    const wq = await db.listDocuments(DATABASE_ID, "wallets", [
      Query.equal("userId", [userId]),
      Query.equal("walletId", [walletId]),
      Query.limit(1),
    ]);

    const w = wq?.documents?.[0];
    if (!w?.$id) return NextResponse.json({ error: "Wallet not found." }, { status: 404 });

    const current = Number(w.balance || 0);
    const next = Math.max(0, current + amount);

    await db.updateDocument(DATABASE_ID, "wallets", w.$id, {
      balance: next,
      updatedDate: new Date().toISOString(),
    });

    await db.createDocument(DATABASE_ID, "transactions", ID.unique(), {
      transactionId: crypto.randomUUID?.() || String(Date.now()),
      userId,
      walletId: w.walletId,
      amount: Math.abs(amount),
      currencyType: w.currencyType || "USD",
      transactionType: "admin_adjustment",
      transactionDate: new Date().toISOString(),
      status: "completed",
      meta: JSON.stringify({ delta: amount, before: current, after: next }),
      type: "admin_adjustment",
    });

    await db.createDocument(DATABASE_ID, "alerts", ID.unique(), {
      alertId: `admin_adjust_${Date.now()}`,
      title: "Balance Updated",
      body: `Your wallet balance was updated by admin (${amount > 0 ? "+" : ""}${amount}).`,
      alertTitle: "Balance Updated",
      alertMessage: `Your wallet balance was updated by admin (${amount > 0 ? "+" : ""}${amount}).`,
      severity: "medium",
      userId,
      isResolved: false,
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json({ ok: true, balance: next });
  } catch (e) {
    return NextResponse.json(
      { error: e?.message || "Failed to adjust wallet." },
      { status: e?.status || 500 }
    );
  }
}
