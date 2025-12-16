import "server-only";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { Resend } from "resend";
import VerifyCodeEmail from "../../../../components/VerifyCodeEmail";
import { getAdminClient } from "../../../../lib/appwriteAdmin";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const userId = String(body?.userId || "").trim();
    if (!userId) return NextResponse.json({ ok: false, error: "Missing userId." }, { status: 400 });

    const from = process.env.VERIFY_FROM_EMAIL;
    if (!process.env.RESEND_API_KEY || !from) {
      return NextResponse.json(
        { ok: false, error: "Email not configured. Set RESEND_API_KEY and VERIFY_FROM_EMAIL." },
        { status: 500 }
      );
    }

    const { db, users, DB_ID } = getAdminClient();

    // Always fetch the real email from Appwrite (prevents spoofing)
    const u = await users.get(userId);
    const email = u?.email;
    if (!email) return NextResponse.json({ ok: false, error: "User email not found." }, { status: 400 });

    const code = String(Math.floor(100000 + Math.random() * 900000));
    const now = new Date().toISOString();

    const VERIFY_COL = process.env.APPWRITE_VERIFY_CODES_COLLECTION_ID || "verify_codes";

    // Upsert code doc (docId = userId)
    try {
      await db.getDocument(DB_ID, VERIFY_COL, userId);
      await db.updateDocument(DB_ID, VERIFY_COL, userId, { userId, code, used: false, createdAt: now, usedAt: null });
    } catch {
      await db.createDocument(DB_ID, VERIFY_COL, userId, { userId, code, used: false, createdAt: now, usedAt: null });
    }

    const { data, error } = await resend.emails.send({
      from,              // MUST be a verified sender in your Resend account
      to: [email],
      subject: "Your verification code",
      react: VerifyCodeEmail({ brand: "Day Trader", code, email }),
    });

    if (error) {
      return NextResponse.json({ ok: false, error: error?.message || "Resend failed." }, { status: 500 });
    }

    return NextResponse.json({ ok: true, data }, { status: 200 });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e?.message || "Unable to send code." }, { status: 500 });
  }
}
