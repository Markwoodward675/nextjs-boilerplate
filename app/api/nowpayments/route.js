export const runtime = "nodejs";

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  });
}

export async function POST(req) {
  try {
    const body = await req.json();
    const { price_amount, price_currency = "usd", pay_currency = "usdttrc20", order_id } = body || {};

    if (!price_amount || Number(price_amount) <= 0) {
      return json({ ok: false, error: "Invalid amount" }, 400);
    }

    const apiKey = process.env.NOWPAYMENTS_API_KEY;
    if (!apiKey) return json({ ok: false, error: "NOWPAYMENTS_API_KEY missing" }, 500);

    const ipn_callback_url = process.env.NOWPAYMENTS_IPN_CALLBACK_URL;
    const success_url = process.env.NOWPAYMENTS_SUCCESS_URL;
    const cancel_url = process.env.NOWPAYMENTS_CANCEL_URL;

    const r = await fetch("https://api.nowpayments.io/v1/invoice", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
      },
      body: JSON.stringify({
        price_amount: Number(price_amount),
        price_currency,
        pay_currency,
        order_id: order_id || `dt_${Date.now()}`,
        order_description: "Day Trader funding",
        ipn_callback_url,
        success_url,
        cancel_url,
      }),
    });

    const j = await r.json();
    if (!r.ok) return json({ ok: false, error: j?.message || "NOWPayments failed", raw: j }, 400);

    return json({ ok: true, invoice: j });
  } catch (e) {
    return json({ ok: false, error: e?.message || "Bad request" }, 400);
  }
}
