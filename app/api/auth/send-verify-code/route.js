import "server-only";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getAdminClient } from "../../../../lib/appwriteAdmin";

function escapeHtml(s) {
  return String(s || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const userId = String(body?.userId || "").trim();
    if (!userId) {
      return NextResponse.json({ ok: false, error: "Missing userId." }, { status: 400 });
    }

    const RESEND_API_KEY = process.env.RESEND_API_KEY;
    const from = process.env.VERIFY_FROM_EMAIL;

    if (!RESEND_API_KEY || !from) {
      return NextResponse.json(
        { ok: false, error: "Email not configured. Set RESEND_API_KEY and VERIFY_FROM_EMAIL." },
        { status: 500 }
      );
    }

    const { db, users, DATABASE_ID } = getAdminClient();

    const u = await users.get(userId);
    const email = u?.email;
    if (!email) {
      return NextResponse.json({ ok: false, error: "User email not found." }, { status: 400 });
    }

    const code = String(Math.floor(100000 + Math.random() * 900000));
    const now = new Date().toISOString();

    const VERIFY_COL = process.env.APPWRITE_VERIFY_CODES_COLLECTION_ID || "verify_codes";

    // docId = userId
    const payload = { userId, code, used: false, createdAt: now, usedAt: "" };

    try {
      await db.getDocument(DATABASE_ID, VERIFY_COL, userId);
      await db.updateDocument(DATABASE_ID, VERIFY_COL, userId, payload);
    } catch {
      await db.createDocument(DATABASE_ID, VERIFY_COL, userId, payload);
    }

    const html = `
      <div style="font-family:Inter,system-ui,Arial;padding:20px;background:#0b0b0f;color:#fff;border-radius:14px">
        <div style="font-size:18px;font-weight:800;color:#fbbf24">Day Trader</div>
        <div style="opacity:.85;margin-top:6px">Secure verification code</div>
        <div style="margin-top:14px;font-size:34px;letter-spacing:6px;font-weight:900;color:#fbbf24">
          ${escapeHtml(code)}
        </div>
        <div style="opacity:.75;margin-top:10px;font-size:13px">
          This code was requested for <b>${escapeHtml(email)}</b>
        </div>
        <div style="opacity:.6;margin-top:14px;font-size:12px">
          If you didn’t request this, you can ignore this email.
        </div>
      </div>
    `;

    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        authorization: `Bearer ${RESEND_API_KEY}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [email],
        subject: "Your verification code",
        html,
      }),
    });

    const data = await r.json().catch(() => ({}));
    if (!r.ok) {
      return NextResponse.json(
        { ok: false, error: data?.message || "Resend failed." },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e?.message || "Unable to send code." }, { status: 500 });
  }
}
