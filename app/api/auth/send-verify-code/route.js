// app/api/auth/send-verify-code/route.js
import "server-only";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getAdminClient } from "../../../../lib/appwriteAdmin";

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

    // Always fetch real email
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

    // Upsert: docId = userId
    try {
      await db.getDocument(DATABASE_ID, VERIFY_COL, userId);
      await db.updateDocument(DATABASE_ID, VERIFY_COL, userId, payload);
    } catch {
      await db.createDocument(DATABASE_ID, VERIFY_COL, userId, payload);
    }

    const safeBrand = "Day Trader";
    const html = `
      <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial; background:#0b1020; padding:24px;">
        <div style="max-width:520px; margin:0 auto; background:#0f172a; border:1px solid rgba(245,158,11,.35); border-radius:16px; padding:18px;">
          <div style="color:#fbbf24; font-weight:800; font-size:18px;">${safeBrand}</div>
          <div style="color:rgba(226,232,240,.9); margin-top:10px; font-size:14px;">
            Your verification code is:
          </div>
          <div style="margin-top:12px; font-size:28px; letter-spacing:.4em; font-weight:900; color:#fde68a;">
            ${code}
          </div>
          <div style="margin-top:12px; color:rgba(226,232,240,.75); font-size:12px;">
            If you didn't request this, you can ignore this email.
          </div>
        </div>
      </div>
    `.trim();

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
