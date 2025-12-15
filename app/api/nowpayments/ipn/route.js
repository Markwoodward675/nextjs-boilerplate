import { NextResponse } from "next/server";
import crypto from "crypto";

export async function POST(req) {
  const raw = await req.text();
  const signature = req.headers.get("x-nowpayments-sig") || "";

  const secret = process.env.NOWPAYMENTS_IPN_SECRET || "";
  if (!secret) return NextResponse.json({ ok: false, error: "Missing IPN secret" }, { status: 500 });

  const h = crypto.createHmac("sha512", secret).update(raw).digest("hex");
  if (h !== signature) return NextResponse.json({ ok: false, error: "Invalid signature" }, { status: 401 });

  const event = JSON.parse(raw);

  // You must include userId in order_id or metadata when creating invoice.
  // Example order_id: DT-<userId>-<timestamp>
  const orderId = String(event?.order_id || "");
  const parts = orderId.split("-");
  const userId = parts.length >= 3 ? parts[1] : "";

  // Handle only confirmed/finished payments
  const status = String(event?.payment_status || "");
  const paidAmount = Number(event?.price_amount || 0);

  if (!userId || !paidAmount) return NextResponse.json({ ok: true });

  // For security, you can enforce only certain statuses:
  if (!["finished", "confirmed"].includes(status)) return NextResponse.json({ ok: true });

  // NOTE: We can’t import client SDK from /lib/api.js server-side safely in this snippet.
  // So: keep IPN as logging OR use Appwrite Server SDK with API Key (recommended).
  // For now we acknowledge.
  return NextResponse.json({ ok: true });
}
