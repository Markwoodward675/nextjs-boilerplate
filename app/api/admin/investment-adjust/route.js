import { NextResponse } from "next/server";
import { getAdmin, requireAdminAuth } from "../../../../lib/appwriteAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req) {
  try {
    requireAdminAuth(req);
    const { db, DATABASE_ID, ID, Query } = getAdmin();

    const body = await req.json().catch(() => ({}));
    const userId = String(body?.userId || "").trim();
    const progress = Number(body?.progress);
    const roiCredit = Number(body?.roiCredit || 0);

    if (!userId) return NextResponse.json({ error: "Missing userId." }, { status: 400 });
    if (!Number.isFinite(progress) || progress < 0 || progress > 100) {
      return NextResponse.json({ error: "Progress must be 0 - 100." }, { status: 400 });
    }
    if (!Number.isFinite(roiCredit)) {
      return NextResponse.json({ error: "Invalid roiCredit." }, { status: 400 });
    }

    // Find preferred wallet: USD first, else first active wallet
    const wallets = await db.listDocuments(DATABASE_ID, "wallets", [
      Query.equal("userId", [userId]),
      Query.orderDesc("$createdAt"),
      Query.limit(100),
    ]);

    const ws = wallets?.documents || [];
    const preferred =
      ws.find((w) => String(w.currencyType || "").toUpperCase() === "USD") ||
      ws.find((w) => w.isActive) ||
      ws[0];

    if (!preferred?.$id) {
      // still record admin event even if no wallet
      await db.createDocument(DATABASE_ID, "alerts", ID.unique(), {
        alertId: `invest_ctl_${Date.now()}`,
        title: "Investment Progress Updated",
        body: `Progress set to ${progress}%. ROI credit queued: ${roiCredit}.`,
        alertTitle: "Investment Progress Updated",
        alertMessage: `Progress set to ${progress}%. ROI credit queued: ${roiCredit}.`,
        severity: "medium",
        userId,
        isResolved: false,
        createdAt: new Date().toISOString(),
      });

      return NextResponse.json({ ok: true, message: "No wallet found; alert saved only." });
    }

    // If roiCredit != 0, credit wallet
    let newBalance = Number(preferred.balance || 0);

    if (roiCredit !== 0) {
      newBalance = Math.max(0, newBalance + roiCredit);
      await db.updateDocument(DATABASE_ID, "wallets", preferred.$id, {
        balance: newBalance,
        updatedDate: new Date().toISOString(),
      });
    }

    await db.createDocument(DATABASE_ID, "transactions", ID.unique(), {
      transactionId: crypto.randomUUID?.() || String(Date.now()),
      userId,
      walletId: preferred.walletId,
      amount: Math.abs(roiCredit),
      currencyType: preferred.currencyType || "USD",
      transactionType: "admin_adjustment",
      transactionDate: new Date().toISOString(),
      status: "completed",
      meta: JSON.stringify({ kind: "investment_adjust", progress, roiCredit }),
      type: "admin_adjustment",
    });

    await db.createDocument(DATABASE_ID, "alerts", ID.unique(), {
      alertId: `invest_ctl_${Date.now()}`,
      title: "Investment Progress Updated",
      body: `Progress: ${progress}%. ROI credited: ${roiCredit}.`,
      alertTitle: "Investment Progress Updated",
      alertMessage: `Progress: ${progress}%. ROI credited: ${roiCredit}.`,
      severity: "low",
      userId,
      isResolved: false,
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json({
      ok: true,
      message: "Investment controls updated.",
      walletId: preferred.walletId,
      balance: newBalance,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e?.message || "Failed to adjust investment controls." },
      { status: e?.status || 500 }
    );
  }
}
