// app/api/auth/send-verify-code/route.js
import "server-only";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getAdminClient } from "../../../../lib/appwriteAdmin";

function escapeHtml(s = "") {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function verificationEmailHtml({ brand, code, email }) {
  const BRAND = escapeHtml(brand || "Day Trader");
  const CODE = escapeHtml(code || "");
  const EMAIL = escapeHtml(email || "");

  // clean, “mature” email (no react-dom/server)
  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>${BRAND} Verification Code</title>
  </head>
  <body style="margin:0;background:#050814;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Arial;color:#e5e7eb;">
    <div style="max-width:560px;margin:0 auto;padding:28px 18px;">
      <div style="border:1px solid rgba(245,158,11,.25);background:rgba(2,6,23,.85);border-radius:18px;padding:22px;">
        <div style="display:flex;align-items:center;gap:12px;">
          <div style="width:44px;height:44px;border-radius:14px;border:1px solid rgba(245,158,11,.45);background:rgba(0,0,0,.35);display:flex;align-items:center;justify-content:center;">
            <span style="font-weight:900;color:#fbbf24;">DT</span>
          </div>
          <div>
            <div style="font-size:18px;font-weight:800;color:#fbbf24;line-height:1;">${BRAND}</div>
            <div style="font-size:12px;letter-spacing:.26em;text-transform:uppercase;color:rgba(253,230,138,.7);margin-top:4px;">
              Markets • Wallets • Execution
            </div>
          </div>
        </div>

        <div style="margin-top:18px;font-size:14px;color:rgba(226,232,240,.92);">
          Use this 6-digit code to complete verification for <b>${EMAIL}</b>.
        </div>

        <div style="margin-top:16px;border-radius:14px;border:1px solid rgba(56,189,248,.22);background:rgba(59,130,246,.10);padding:16px;text-align:center;">
          <div style="font-size:12px;color:rgba(226,232,240,.75);letter-spacing:.12em;text-transform:uppercase;">Verification code</div>
          <div style="margin-top:8px;font-size:34px;font-weight:900;letter-spacing:.22em;color:#f59e0b;">${CODE}</div>
        </div>

        <div style="margin-top:14px;font-size:12px;color:rgba(148,163,184,.9);">
          If you didn’t request this code, you can safely ignore this email.
        </div>
      </div>

      <div style="margin-top:12px;text-align:center;font-size:11px;color:rgba(148,163,184,.7);">
        © ${new Date().getFullYear()} ${BRAND}
      </div>
    </div>
  </body>
</html>`;
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

    // pull real email from Appwrite (prevents spoof)
    const u = await users.get(userId);
    const email = u?.email;
    if (!email) {
      return NextResponse.json({ ok: false, error: "User email not found." }, { status: 400 });
    }

    const code = String(Math.floor(100000 + Math.random() * 900000));
    const nowIso = new Date().toISOString();

    const VERIFY_COL =
      process.env.APPWRITE_VERIFY_CODES_COLLECTION_ID ||
      process.env.NEXT_PUBLIC_APPWRITE_VERIFY_CODES_COLLECTION_ID ||
      "verify_codes";

    // IMPORTANT: your verify_codes schema has:
    // userId (required), code (required), used (required boolean)
    // createdAt (string nullable), usedAt (string nullable)
    const payload = {
      userId,
      code,
      used: false,
      createdAt: nowIso,
      usedAt: null,
    };

    // docId = userId
    try {
      await db.getDocument(DATABASE_ID, VERIFY_COL, userId);
      await db.updateDocument(DATABASE_ID, VERIFY_COL, userId, payload);
    } catch {
      await db.createDocument(DATABASE_ID, VERIFY_COL, userId, payload);
    }

    const html = verificationEmailHtml({ brand: "Day Trader", code, email });

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
        { ok: false, error: data?.message || data?.error || "Resend failed." },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e?.message || "Unable to send code." },
      { status: 500 }
    );
  }
}
