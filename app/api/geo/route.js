export const runtime = "edge";

export async function GET(req) {
  const country =
    req.headers.get("x-vercel-ip-country") ||
    req.headers.get("cf-ipcountry") ||
    "Unknown";
  return new Response(JSON.stringify({ country }), {
    headers: { "content-type": "application/json" },
  });
}
