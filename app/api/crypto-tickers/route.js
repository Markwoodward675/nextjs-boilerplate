// app/api/crypto-tickers/route.js
import { NextResponse } from "next/server";

export async function GET() {
  // Placeholder list (no external calls)
  return NextResponse.json({
    ok: true,
    tickers: ["BTC", "ETH", "USDT", "BNB", "SOL", "XRP", "DOGE", "ADA"],
  });
}
