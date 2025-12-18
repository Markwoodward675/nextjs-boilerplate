// app/api/auth/send-verify-code/route.js
import "server-only";
export const runtime = "nodejs";

import React from "react";
import { NextResponse } from "next/server";
import VerifyCodeEmail from "../../../../components/VerifyCodeEmail";
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

    const u = await users.get(userId);
    const email = u?.email;
    if (!email) return NextResponse.json({ ok: false, error: "User email not found." }, { status: 400 });

    const code = String(Math.floor(100000 + Math.random() * 900000));
    const now = new Date().toISOString();

    const VERIFY_COL = process.env.APPWRITE_VERIFY_CODES_COLLECTION_ID || "verify_codes";

    // docId = userId
    try {
      await db.getDocument(DATABASE_ID, VERIFY_COL, userId);
      await db.updateDocument(DATABASE_ID, VERIFY_COL, userId, {
        userId,
        code,
        used: false,
        createdAt: now,
        usedAt: null,
      });
    } catch {
      await db.createDocument(DATABASE_ID, VERIFY_COL, userId, {
        userId,
        code,
        used: false,
        createdAt: now,
        usedAt: null,
      });
    }

    // Send using Resend REST API directly (no npm package)
    const html = React.renderToStaticMarkup
      ? React.renderToStaticMarkup(React.createElement(VerifyCodeEmail, { brand: "Day Trader", code, email }))
      : `<div><h2>Day Trader</h2><p>Your verification code is <b>${code}</b></p></div>`;

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
