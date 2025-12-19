// app/api/auth/send-verify-code/route.js
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

function buildEmailHtml({ brand, code, email }) {
  const b = escapeHtml(brand);
  const c = escapeHtml(code);
  const e = escapeHtml(email);

  return `
  <div style="background:#050814;padding:28px;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial;color:#e5e7eb;">
    <div style="max-width:520px;margin:0 auto;border:1px solid rgba(234,179,8,.35);border-radius:16px;background:rgba(0,0,0,.35);overflow:hidden;">
      <div style="padding:18px 18px 12px;border-bottom:1px solid rgba(234,179,8,.25);">
        <div style="font-size:18px;font-weight:800;color:#fbbf24;">${b}</div>
        <div style="font-size:12px;letter-spacing:.18em;text-transform:uppercase;color:rgba(251,191,36,.75);margin-top:4px;">
          Secure verification
        </div>
      </div>
      <div style="padding:18px;">
        <div style="font-size:14px;color:rgba(229,231,235,.9);">Hi ${e},</div>
        <div style="margin-top:10px;font-size:13px;color:rgba(229,231,235,.78);">
          Use this 6-digit code to verify your account:
        </div>
        <div style="margin-top:14px;padding:14px;border-radius:14px;background:rgba(59,130,246,.10);border:1px solid rgba(99,102,241,.35);text-align:center;">
          <div style="font-size:28px;letter-spacing:.32em;font-weight:900;color:#fde68a;">${c}</div>
        </div>
        <div style="margin-top:14px;font-size:12px;color:rgba(229,231,235,.65);">
          If you didn’t request this, you can ignore this email.
        </div>
      </div>
    </div>
  </div>`;
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

    const payload = { userId, code, used: false, createdAt: now, usedAt: "" };

    try {
      await db.getDocument(DATABASE_ID, VERIFY_COL, userId);
      await db.updateDocument(DATABASE_ID, VERIFY_COL, userId, payload);
    } catch {
      await db.createDocument(DATABASE_ID, VERIFY_COL, userId, payload);
    }

    const html = buildEmailHtml({ brand: "Day Trader", code, email });

    // Resend REST (no npm package needed)
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
