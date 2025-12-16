import "server-only";

export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getAdminClient } from "../../../../lib/appwriteAdmin";

async function sendEmailResend({ to, subject, html }) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.VERIFY_FROM_EMAIL; // e.g. "Day Trader <no-reply@yourdomain.com>"

  if (!apiKey || !from) {
    throw new Error("Email is not configured. Missing RESEND_API_KEY or VERIFY_FROM_EMAIL.");
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to,
      subject,
      html,
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Email send failed (${res.status}). ${text}`);
  }
}

export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const userId = String(body?.userId || "").trim();

    if (!userId) {
      return NextResponse.json({ ok: false, error: "Missing userId." }, { status: 400 });
    }

    const { db, users, DB_ID, ID } = getAdminClient();

    // Get user's real email from Appwrite (prevents spoofing)
    const u = await users.get(userId);
    const email = u?.email;
    if (!email) {
      return NextResponse.json({ ok: false, error: "User email not found." }, { status: 400 });
    }

    // Generate 6-digit code
    const code = String(Math.floor(100000 + Math.random() * 900000));
    const now = new Date().toISOString();

    // Store in verify_codes collection (docId = userId)
    const VERIFY_COL = process.env.APPWRITE_VERIFY_CODES_COLLECTION_ID || "verify_codes";

    // Upsert
    try {
      await db.getDocument(DB_ID, VERIFY_COL, userId);
      await db.updateDocument(DB_ID, VERIFY_COL, userId, {
        userId,
        code,
        used: false,
        createdAt: now,
        usedAt: null,
      });
    } catch {
      await db.createDocument(DB_ID, VERIFY_COL, userId, {
        userId,
        code,
        used: false,
        createdAt: now,
        usedAt: null,
      });
    }

    // Send email
    const subject = "Your Day Trader verification code";
    const html = `
      <div style="font-family:Inter,Arial,sans-serif; line-height:1.5; color:#111;">
        <h2 style="margin:0 0 10px;">Verify your account</h2>
        <p style="margin:0 0 12px;">Use this 6-digit code to verify your account:</p>
        <div style="font-size:28px; font-weight:700; letter-spacing:6px; padding:12px 16px; background:#000; color:#facc15; display:inline-block; border-radius:10px;">
          ${code}
        </div>
        <p style="margin:16px 0 0; color:#444;">If you didn’t request this code, you can ignore this email.</p>
      </div>
    `;

    await sendEmailResend({ to: email, subject, html });

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e?.message || "Unable to send code." },
      { status: 500 }
    );
  }
}
