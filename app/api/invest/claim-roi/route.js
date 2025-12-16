import { NextResponse } from "next/server";
import { getAdmin } from "../../../../lib/appwriteAdmin";
import { ID } from "node-appwrite";

const COL_TX = "transactions";
const COL_ALERTS = "alerts";

export async function POST(req) {
  try {
    const { db, DATABASE_ID } = getAdmin();
    const body = await req.json();
    const { userId, investTxId } = body || {};

    if (!userId || !investTxId) return NextResponse.json({ ok: false, error: "Missing userId/investTxId." }, { status: 400 });

    const invest = await db.getDocument(DATABASE_ID, COL_TX, investTxId);

    const meta = safeJSON(invest.meta);
    const rate = Number(meta.roiRate || 0);
    const principal = Number(invest.amount || 0);

    // credit 1 day ROI on claim (admin can adjust by editing meta/amount later)
    const roi = principal * rate;

    await db.createDocument(DATABASE_ID, COL_TX, ID.unique(), {
      transactionId: crypto.randomUUID(),
      userId,
      walletId: invest.walletId,
      amount: roi,
      currencyType: "USD",
      transactionType: "invest_roi",
      transactionDate: new Date().toISOString(),
      status: "approved",
      meta: JSON.stringify({ sourceInvestTxId: investTxId }),
      type: "invest_roi",
    });

    await db.updateDocument(DATABASE_ID, COL_TX, investTxId, { status: "completed" }).catch(() => {});

    await db.createDocument(DATABASE_ID, COL_ALERTS, ID.unique(), {
      alertId: crypto.randomUUID().slice(0, 12),
      alertTitle: "ROI credited",
      alertMessage: `ROI credited: $${roi.toLocaleString()}`,
      severity: "info",
      userId,
      isResolved: false,
      title: "ROI credited",
      body: `ROI credited: $${roi.toLocaleString()}`,
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json({ ok: true, roi });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e?.message || "Server error" }, { status: 500 });
  }
}

function safeJSON(s) {
  try { return JSON.parse(s || "{}"); } catch { return {}; }
}
