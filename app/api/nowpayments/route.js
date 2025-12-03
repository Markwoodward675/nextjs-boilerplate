import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    const apiKey = process.env.NOWPAYMENTS_API_KEY;
    const ipnUrl = process.env.NOWPAYMENTS_IPN_URL || undefined;

    if (!apiKey) {
      return NextResponse.json(
        { error: "NOWPayments is not configured." },
        { status: 500 }
      );
    }

    const { amount, currency } = await req.json();

    if (!amount || !currency) {
      return NextResponse.json(
        { error: "Amount and currency are required." },
        { status: 400 }
      );
    }

    const body = {
      price_amount: amount,
      price_currency: currency,
      pay_currency: "btc", // you can change to "usdt", "eth", etc.
      order_id: `dep_${Date.now()}`,
      order_description: "Day Trader wallet deposit",
      success_url: process.env.NOWPAYMENTS_SUCCESS_URL || "",
      cancel_url: process.env.NOWPAYMENTS_CANCEL_URL || "",
      ipn_callback_url: ipnUrl
    };

    const res = await fetch("https://api.nowpayments.io/v1/invoice", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    });

    const data = await res.json();

    if (!res.ok) {
      console.error("NOWPayments error:", data);
      return NextResponse.json(
        { error: data?.message || "NOWPayments API error" },
        { status: res.status }
      );
    }

    return NextResponse.json(data, { status: 200 });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Unexpected error while creating NOWPayments invoice." },
      { status: 500 }
    );
  }
}
