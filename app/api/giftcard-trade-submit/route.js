import { NextResponse } from "next/server";
import { getAdmin } from "../../../lib/appwriteAdmin";
import { ID } from "node-appwrite";

const COL_TX = "transactions";
const COL_ALERTS = "alerts";
const BUCKET = process.env.NEXT_PUBLIC_APPWRITE_BUCKET_ID || "uploads";

export async function POST(req) {
  try {
    const { db, storage, DATABASE_ID } = getAdmin();

    const ct = req.headers.get("content-type") || "";
    let payload = {};
    let fileId = "";

    if (ct.includes("multipart/form-data")) {
      const form = await req.formData();
      payload.userId = String(form.get("userId") || "");
      payload.side = String(form.get("side") || "sell");
      payload.vendor = String(form.get("vendor") || "");
      payload.amount = Number(form.get("amount") || 0);
      payload.pin = String(form.get("pin") || "");
      const photo = form.get("photo");
      if (photo) {
        const up = await storage.createFile(BUCKET, ID.unique(), photo);
        fileId = up.$id;
      }
    } else {
      payload = await req.json();
    }

    const { userId, side, vendor, amount } = payload || {};
    if (!userId || !vendor || !(Number(amount) > 0)) {
      return NextResponse.json({ ok: false, error: "Missing userId/vendor/amount." }, { status: 400 });
    }

    const txType = side === "sell" ? "giftcard_sell" : "giftcard_buy";

    const tx = await db.createDocument(DATABASE_ID, COL_TX, ID.unique(), {
      transactionId: crypto.randomUUID(),
      userId,
      walletId: crypto.randomUUID(),
      amount: Number(amount),
      currencyType: "USD",
      transactionType: txType,
      transactionDate: new Date().toISOString(),
      status: "pending",
      meta: JSON.stringify({ vendor, side, pin: payload.pin || "", photoFileId: fileId }),
      type: txType,
    });

    await db.createDocument(DATABASE_ID, COL_ALERTS, ID.unique(), {
      alertId: crypto.randomUUID().slice(0, 12),
      alertTitle: `Giftcard ${side} submitted`,
      alertMessage: `${vendor} • $${Number(amount).toLocaleString()}`,
      severity: "info",
      userId,
      isResolved: false,
      title: `Giftcard ${side} submitted`,
      body: `${vendor} • $${Number(amount).toLocaleString()}`,
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json({ ok: true, tx });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e?.message || "Server error" }, { status: 500 });
  }
}
