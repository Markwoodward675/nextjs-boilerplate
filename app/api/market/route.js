export async function GET() {
  const apiKey = process.env.CMC_API_KEY;

  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: "CMC API key not configured" }),
      { status: 500 }
    );
  }

  try {
    const res = await fetch(
      "https://pro-api.coinmarketcap.com/v1/cryptocurrency/listings/latest?limit=10&convert=USD",
      {
        headers: {
          "X-CMC_PRO_API_KEY": apiKey,
          Accept: "application/json"
        },
        next: { revalidate: 60 }
      }
    );

    if (!res.ok) {
      const text = await res.text();
      console.error("CMC API error", res.status, text);
      return new Response(
        JSON.stringify({ error: "CMC API request failed" }),
        { status: 502 }
      );
    }

    const data = await res.json();

    const mapped = (data?.data || []).map((item) => {
      const quote = item.quote?.USD || {};
      return {
        id: item.id,
        name: item.name,
        symbol: item.symbol,
        price: quote.price ?? null,
        percentChange24h: quote.percent_change_24h ?? null,
        marketCap: quote.market_cap ?? null
      };
    });

    return new Response(JSON.stringify({ assets: mapped }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (err) {
    console.error("CMC fetch error", err);
    return new Response(
      JSON.stringify({ error: "Internal error fetching market data" }),
      { status: 500 }
    );
  }
}
