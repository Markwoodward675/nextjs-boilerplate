export const runtime = "nodejs";

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  });
}

export async function POST(req) {
  try {
    // Keep minimal for Free plan: accept payload, later wire signature + Appwrite update.
    const sig = req.headers.get("x-nowpayments-sig");
    if (!sig) return json({ ok: false, error: "Missing signature" }, 401);

    const payload = await req.json();

    // TODO (next): verify signature (HMAC SHA512 with NOWPAYMENTS_IPN_SECRET),
    // then update Appwrite transaction + credit wallet when payment_status === "finished".
    return json({ ok: true, received: true, payment_status: payload?.payment_status || null });
  } catch (e) {
    return json({ ok: false, error: e?.message || "IPN error" }, 400);
  }
}
