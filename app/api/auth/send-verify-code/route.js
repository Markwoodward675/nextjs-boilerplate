// app/api/auth/send-verify-code/route.js
import "server-only";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getAdminClient } from "../../../../lib/appwriteAdmin";

function escapeHtml(s) {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function upsertDoc(db, DATABASE_ID, collectionId, docId, data) {
  // Basic upsert (no schema guessing needed because we only write safe fields)
  try {
    await db.getDocument(DATABASE_ID, collectionId, docId);
    return await db.updateDocument(DATABASE_ID, collectionId, docId, data);
  } catch {
    return await db.createDocument(DATABASE_ID, collectionId, docId, data);
  }
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

    // Always fetch real email from Appwrite Users API
    const u = await users.get(userId);
    const email = u?.email;
    if (!email) return NextResponse.json({ ok: false, error: "User email not found." }, { status: 400 });

    const code = String(Math.floor(100000 + Math.random() * 900000));
    const now = new Date().toISOString();

    const VERIFY_COL =
      process.env.APPWRITE_VERIFY_CODES_COLLECTION_ID ||
      process.env.NEXT_PUBLIC_APPWRITE_VERIFY_CODES_COLLECTION_ID ||
      "verify_codes";

    // Store code (docId = userId)
    await upsertDoc(db, DATABASE_ID, VERIFY_COL, userId, {
      userId,
      code,
      used: false,
      createdAt: now, // if your schema doesn't include this, remove it from schema or remove this line
    });

    // Plain HTML (no react-dom/server)
    const html = `
      <div style="font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto; padding:16px;">
        <h2 style="margin:0 0 8px;">Day Trader</h2>
        <p style="margin:0 0 12px; color:#334155;">Your verification code is:</p>
        <div style="font-size:28px; font-weight:800; letter-spacing:6px; padding:12px 16px; border:1px solid #e2e8f0; border-radius:12px; display:inline-block;">
          ${escapeHtml(code)}
        </div>
        <p style="margin:12px 0 0; color:#64748b; font-size:12px;">
          This code was sent to ${escapeHtml(email)}. If you didn’t request this, you can ignore it.
        </p>
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
      return NextResponse.json({ ok: false, error: data?.message || "Resend failed." }, { status: 500 });
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e?.message || "Unable to send code." }, { status: 500 });
  }
}
