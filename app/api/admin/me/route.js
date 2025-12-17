import { NextResponse } from "next/server";
import { requireAdminAuth } from "../../../../lib/appwriteAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req) {
  try {
    const { user } = await requireAdminAuth(req);
    return NextResponse.json({ ok: true, user: { $id: user.$id, email: user.email, name: user.name } });
  } catch (e) {
    return NextResponse.json({ error: e?.message || "Unauthorized" }, { status: e?.status || 401 });
  }
}
