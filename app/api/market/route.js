export const runtime = "nodejs";

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function bad(msg, status = 400) {
  return json({ ok: false, error: msg }, status);
}

function lastNSeriesFromAlphaVantageTimeSeries(obj, n = 30, field = "4. close") {
  const keys = Object.keys(obj || {}).sort((a, b) => (a < b ? 1 : -1)); // desc
  const slice = keys.slice(0, n).reverse(); // oldest -> newest
  return slice.map((k) => Number(obj[k]?.[field] || 0)).filter((x) => Number.isFinite(x) && x > 0);
}

export async function GET(req) {
  const url = new URL(req.url);
  const kind = url.searchParams.get("kind"); // stock | crypto
  const symbol = (url.searchParams.get("symbol") || "").toUpperCase();

  if (!kind || !symbol) return bad("Missing kind or symbol");

  try {
    // STOCK: AlphaVantage quote + series
    if (kind === "stock") {
      const key = process.env.ALPHAVANTAGE_API_KEY;
      if (!key) return bad("ALPHAVANTAGE_API_KEY missing", 500);

      const q = await fetch(
        `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${encodeURIComponent(symbol)}&apikey=${encodeURIComponent(key)}`,
        { cache: "no-store" }
      );
      const qj = await q.json();
      const gq = qj?.["Global Quote"] || {};
      const last = gq?.["05. price"] || null;
      const change = gq?.["09. change"] || null;

      const s = await fetch(
        `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=${encodeURIComponent(symbol)}&outputsize=compact&apikey=${encodeURIComponent(key)}`,
        { cache: "no-store" }
      );
      const sj = await s.json();
      const ts = sj?.["Time Series (Daily)"] || {};
      const series = lastNSeriesFromAlphaVantageTimeSeries(ts, 30, "4. close");

      return json({
        ok: true,
        quote: { last, change, source: "Alpha Vantage" },
        series,
      });
    }

    // CRYPTO: CMC quote + AlphaVantage daily series (for chart)
    if (kind === "crypto") {
      const cmc = process.env.COINMARKETCAP_API_KEY;
      const av = process.env.ALPHAVANTAGE_API_KEY;
      if (!cmc) return bad("COINMARKETCAP_API_KEY missing", 500);
      if (!av) return bad("ALPHAVANTAGE_API_KEY missing", 500);

      const r = await fetch(
        `https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest?symbol=${encodeURIComponent(symbol)}`,
        { headers: { "X-CMC_PRO_API_KEY": cmc }, cache: "no-store" }
      );
      const cj = await r.json();
      const coin = cj?.data?.[symbol];
      const last = coin?.quote?.USD?.price != null ? String(coin.quote.USD.price) : null;
      const change = coin?.quote?.USD?.percent_change_24h != null ? `${coin.quote.USD.percent_change_24h}%` : null;

      const s = await fetch(
        `https://www.alphavantage.co/query?function=DIGITAL_CURRENCY_DAILY&symbol=${encodeURIComponent(symbol)}&market=USD&apikey=${encodeURIComponent(av)}`,
        { cache: "no-store" }
      );
      const sj = await s.json();
      const ts = sj?.["Time Series (Digital Currency Daily)"] || {};
      const series = Object.keys(ts || {})
        .sort((a, b) => (a < b ? 1 : -1))
        .slice(0, 30)
        .reverse()
        .map((d) => Number(ts[d]?.["4a. close (USD)"] || 0))
        .filter((x) => Number.isFinite(x) && x > 0);

      return json({
        ok: true,
        quote: { last, change, source: "CMC + Alpha Vantage" },
        series,
      });
    }

    return bad("Invalid kind. Use stock|crypto");
  } catch (e) {
    return bad(e?.message || "Market route error", 500);
  }
}
