import { NextResponse } from "next/server";
import { getAdmin, requireAdminKey } from "@/lib/appwriteAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const allowedSeverity = new Set(["low", "medium", "high", "critical"]);

export async function POST(req) {
  try {
    requireAdminKey(req);
    const { db, DATABASE_ID, ID } = getAdmin();

    const body = await req.json().catch(() => ({}));
    const userId = String(body?.userId || "").trim();
    const title = String(body?.title || "").trim();
    const msg = String(body?.body || "").trim();
    const severity = String(body?.severity || "low").toLowerCase();

    if (!userId) return NextResponse.json({ error: "Missing userId." }, { status: 400 });
    if (!title) return NextResponse.json({ error: "Missing title." }, { status: 400 });
    if (!msg) return NextResponse.json({ error: "Missing body." }, { status: 400 });
    if (!allowedSeverity.has(severity)) {
      return NextResponse.json({ error: "Invalid severity." }, { status: 400 });
    }

    await db.createDocument(DATABASE_ID, "alerts", ID.unique(), {
      alertId: `admin_${Date.now()}`,
      title,
      body: msg,
      alertTitle: title,
      alertMessage: msg,
      severity,
      userId,
      isResolved: false,
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json({ ok: true, message: "Alert sent." });
  } catch (e) {
    return NextResponse.json(
      { error: e?.message || "Failed to send alert." },
      { status: e?.status || 500 }
    );
  }
}
