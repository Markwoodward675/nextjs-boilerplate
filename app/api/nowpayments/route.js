import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    const apiKey = process.env.NOWPAYMENTS_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "NOWPayments is not configured on the server." },
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

    // Build basic invoice body
    const body = {
      price_amount: amount,
      price_currency: currency,
      pay_currency: "btc",
      order_id: `dep_${Date.now()}`,
      order_description: "Day Trader wallet deposit"
    };

    // Only add these if they are actually set (so NOWPayments doesn't see empty strings)
    if (process.env.NOWPAYMENTS_SUCCESS_URL) {
      body.success_url = process.env.NOWPAYMENTS_SUCCESS_URL;
    }
    if (process.env.NOWPAYMENTS_CANCEL_URL) {
      body.cancel_url = process.env.NOWPAYMENTS_CANCEL_URL;
    }
    if (process.env.NOWPAYMENTS_IPN_URL) {
      body.ipn_callback_url = process.env.NOWPAYMENTS_IPN_URL;
    }

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
