export const runtime = "nodejs";

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  });
}

export async function GET() {
  try {
    const key = process.env.COINMARKETCAP_API_KEY;
    if (!key) return json({ ok: false, error: "COINMARKETCAP_API_KEY missing" }, 500);

    const r = await fetch(
      "https://pro-api.coinmarketcap.com/v1/cryptocurrency/listings/latest?start=1&limit=15&convert=USD",
      { headers: { "X-CMC_PRO_API_KEY": key }, cache: "no-store" }
    );
    const j = await r.json();
    if (!r.ok) return json({ ok: false, error: j?.status?.error_message || "CMC failed" }, 400);

    const rows = (j?.data || []).map((c) => ({
      id: c.id,
      symbol: c.symbol,
      name: c.name,
      price: c?.quote?.USD?.price ?? null,
      ch24: c?.quote?.USD?.percent_change_24h ?? null,
      mcap: c?.quote?.USD?.market_cap ?? null,
      vol24: c?.quote?.USD?.volume_24h ?? null,
    }));

    return json({ ok: true, rows });
  } catch (e) {
    return json({ ok: false, error: e?.message || "Crypto route error" }, 500);
  }
}
