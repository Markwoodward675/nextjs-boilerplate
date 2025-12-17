import { NextResponse } from "next/server";
import { getAdmin, requireAdminKey } from "@/lib/appwriteAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req) {
  try {
    requireAdminKey(req);
    const { users } = getAdmin();

    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") || "").trim();

    let list;
    // SDK signatures can differ. Try best-supported patterns.
    try {
      list = q ? await users.list({ search: q }) : await users.list();
    } catch {
      // Fallback: list first 100 and filter
      const r = await users.list();
      const arr = r?.users || [];
      list = { users: q ? arr.filter((u) =>
        String(u?.email || "").includes(q) || String(u?.name || "").includes(q)
      ) : arr };
    }

    return NextResponse.json({ users: list?.users || [] });
  } catch (e) {
    return NextResponse.json(
      { error: e?.message || "Failed to load users." },
      { status: e?.status || 500 }
    );
  }
}
