export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { adminDb, ADMIN_DB_ID } from "@/lib/appwriteAdmin";

export async function POST(req) {
  try {
    const { userId } = await req.json();
    // ...approve KYC logic...
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e?.message || "Failed" }, { status: 500 });
  }
}
