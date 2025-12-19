// app/api/auth/send-verify-code/route.js
import "server-only";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getAdminClient } from "../../../../lib/appwriteAdmin";

function emailHtml({ brand, code, email }) {
  return `
  <div style="font-family:Inter,Arial,sans-serif;background:#050814;padding:24px;color:#e5e7eb">
    <div style="max-width:560px;margin:0 auto;background:rgba(0,0,0,.55);border:1px solid rgba(245,158,11,.45);border-radius:16px;padding:18px">
      <div style="display:flex;align-items:center;gap:10px">
        <div style="width:36px;height:36px;border-radius:12px;border:1px solid rgba(245,158,11,.5);background:rgba(0,0,0,.35)"></div>
        <div>
          <div style="font-weight:800;color:#fbbf24;font-size:18px">${brand}</div>
          <div style="font-size:11px;letter-spacing:.22em;text-transform:uppercase;color:rgba(253,230,138,.85)">Verification</div>
        </div>
      </div>

      <h2 style="margin:14px 0 6px;color:#fff;font-size:16px">Your 6-digit verification code</h2>
      <p style="margin:0 0 12px;color:rgba(226,232,240,.85);font-size:13px">
        Use this code to verify your account (${email}):
      </p>

      <div style="font-size:28px;font-weight:900;letter-spacing:.25em;background:rgba(245,158,11,.12);border:1px solid rgba(245,158,11,.35);padding:14px 16px;border-radius:14px;color:#fbbf24;text-align:center">
        ${code}
      </div>

      <p style="margin:12px 0 0;color:rgba(148,163,184,.9);font-size:12px">
        If you didn’t request this, you can ignore this email.
      </p>
    </div>
  </div>`;
}

export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const userId = String(body?.userId || "").trim();
    if (!userId) return NextResponse.json({ ok: false, error: "Missing userId." }, { status: 400 });

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
    if (!email) return NextResponse.json({ ok: false, error: "User email not found." }, { status: 400 });

    const code = String(Math.floor(100000 + Math.random() * 900000));
    const now = new Date().toISOString();

    const VERIFY_COL =
      process.env.APPWRITE_VERIFY_CODES_COLLECTION_ID ||
      process.env.NEXT_PUBLIC_APPWRITE_VERIFY_CODES_COLLECTION_ID ||
      "verify_codes";

    const payload = { userId, code, used: false, createdAt: now, usedAt: "" };

    try {
      await db.getDocument(DATABASE_ID, VERIFY_COL, userId);
      await db.updateDocument(DATABASE_ID, VERIFY_COL, userId, payload);
    } catch {
      await db.createDocument(DATABASE_ID, VERIFY_COL, userId, payload);
    }

    const html = emailHtml({ brand: "Day Trader", code, email });

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
      return NextResponse.json({ ok: false, error: data?.message || "Resend failed." }, { status: 500 });
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e?.message || "Unable to send code." }, { status: 500 });
  }
}
