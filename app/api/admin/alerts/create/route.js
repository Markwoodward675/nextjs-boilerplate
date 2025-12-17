import { NextResponse } from "next/server";
import { getAdmin, requireAdminAuth } from "../../../../../lib/appwriteAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function alertsCollectionId() {
  return process.env.NEXT_PUBLIC_APPWRITE_ALERTS_COLLECTION_ID || "alerts";
}

export async function POST(req) {
  try {
    await requireAdminAuth(req);
    const body = await req.json().catch(() => ({}));

    const userId = String(body.userId || "").trim();
    const title = String(body.title || "").trim().slice(0, 64);
    const msg = String(body.body || "").trim().slice(0, 255);
    const severity = String(body.severity || "low").toLowerCase();

    if (!userId) return NextResponse.json({ error: "Missing userId." }, { status: 400 });
    if (!title) return NextResponse.json({ error: "Missing title." }, { status: 400 });
    if (!msg) return NextResponse.json({ error: "Missing message." }, { status: 400 });
    if (!["low", "medium", "high", "critical"].includes(severity)) {
      return NextResponse.json({ error: "Invalid severity." }, { status: 400 });
    }

    const { db, DATABASE_ID, ID } = getAdmin();

    const doc = await db.createDocument(DATABASE_ID, alertsCollectionId(), ID.unique(), {
      alertId: crypto.randomUUID(),
      alertTitle: title,
      alertMessage: msg,
      severity,
      alertCategory: "admin",
      userId,
      isResolved: false,
      title,
      body: msg,
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json({ ok: true, alert: doc });
  } catch (e) {
    return NextResponse.json({ error: e?.message || "Failed" }, { status: e?.status || 500 });
  }
}
