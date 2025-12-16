import { NextResponse } from "next/server";
import { getAdmin } from "../../../../lib/appwriteAdmin";
import { ID } from "node-appwrite";

const COL_PROFILES = "profiles";
const COL_USER_PROFILE = "user_profile";
const COL_TX = "transactions";
const COL_ALERTS = "alerts";
const BUCKET = process.env.NEXT_PUBLIC_APPWRITE_BUCKET_ID || "uploads";

export async function POST(req) {
  try {
    const { db, storage, DATABASE_ID } = getAdmin();
    const form = await req.formData();
    const userId = String(form.get("userId") || "");
    const front = form.get("front");
    const back = form.get("back");
    const selfie = form.get("selfie");

    if (!userId || !front || !back || !selfie) {
      return NextResponse.json({ ok: false, error: "Missing userId/front/back/selfie." }, { status: 400 });
    }

    const f = await storage.createFile(BUCKET, ID.unique(), front);
    const b = await storage.createFile(BUCKET, ID.unique(), back);
    const s = await storage.createFile(BUCKET, ID.unique(), selfie);

    // Store IDs in a transaction meta (since profiles/user_profile don't have 3 dedicated columns)
    await db.createDocument(DATABASE_ID, COL_TX, ID.unique(), {
      transactionId: crypto.randomUUID(),
      userId,
      walletId: crypto.randomUUID(), // placeholder if your schema requires; admin can normalize
      amount: 0,
      currencyType: "USD",
      transactionType: "airdrop",
      transactionDate: new Date().toISOString(),
      status: "pending",
      meta: JSON.stringify({ kind: "kyc_submit", front: f.$id, back: b.$id, selfie: s.$id }),
      type: "kyc_submit",
    });

    // Update KYC status in profiles (and user_profile if exists)
    await db.updateDocument(DATABASE_ID, COL_PROFILES, userId, { kycStatus: "pending" }).catch(() => {});
    await db.updateDocument(DATABASE_ID, COL_USER_PROFILE, userId, { kycStatus: "pending", updatedAt: new Date().toISOString() }).catch(() => {});

    await db.createDocument(DATABASE_ID, COL_ALERTS, ID.unique(), {
      alertId: crypto.randomUUID().slice(0, 12),
      alertTitle: "KYC submitted",
      alertMessage: "Your KYC documents have been submitted for review.",
      severity: "info",
      userId,
      isResolved: false,
      title: "KYC submitted",
      body: "Your KYC documents have been submitted for review.",
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json({ ok: true, files: { front: f.$id, back: b.$id, selfie: s.$id } });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e?.message || "Server error" }, { status: 500 });
  }
}
