import { NextResponse } from "next/server";

export async function POST(req) {
  const body = await req.json();
  const { price_amount, price_currency = "usd", pay_currency = "usdttrc20", order_id } = body || {};

  if (!process.env.NOWPAYMENTS_API_KEY) {
    return NextResponse.json({ error: "NOWPayments API key missing" }, { status: 500 });
  }

  const base = process.env.NOWPAYMENTS_BASE || "https://api.nowpayments.io/v1";
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "";

  const payload = {
    price_amount,
    price_currency,
    pay_currency,
    order_id: order_id || `DT-${Date.now()}`,
    order_description: "Deposit",
    ipn_callback_url: `${appUrl}/api/nowpayments/ipn`,
    success_url: `${appUrl}/deposit/success`,
    cancel_url: `${appUrl}/deposit/cancel`,
  };

  const r = await fetch(`${base}/invoice`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.NOWPAYMENTS_API_KEY,
    },
    body: JSON.stringify(payload),
  });

  const data = await r.json();
  if (!r.ok) return NextResponse.json({ error: data }, { status: r.status });

  return NextResponse.json(data);
}
