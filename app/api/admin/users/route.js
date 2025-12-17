import { NextResponse } from "next/server";
import { getAdmin, requireAdminAuth } from "../../../../lib/appwriteAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req) {
  try {
    await requireAdminAuth(req);

    const { users } = getAdmin();
    const r = await users.list();

    const out = (r?.users || []).map((u) => ({
      $id: u.$id,
      email: u.email,
      name: u.name,
      status: u.status,
      $createdAt: u.$createdAt,
    }));

    return NextResponse.json({ users: out });
  } catch (e) {
    return NextResponse.json({ error: e?.message || "Failed" }, { status: e?.status || 500 });
  }
}
