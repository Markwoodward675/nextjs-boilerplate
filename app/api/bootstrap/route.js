// app/api/bootstrap/route.js
import "server-only";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getAdminClient } from "../../../lib/appwriteAdmin";
import { Client, Account } from "node-appwrite";

export async function POST() {
  try {
    // Client-side uses account.get() already; this route is for profile hydration.
    // We’ll just return profile by reading user id from Appwrite session via cookie-less client is not possible here,
    // so we rely on client calling ensureUserBootstrap() AFTER account.get() succeeds,
    // and it sends no body; we can’t know userId here unless you pass it.
    // Hardfix: accept userId in body if you want.
    return NextResponse.json(
      { ok: false, error: "Bootstrap requires userId. Update call to POST { userId }." },
      { status: 400 }
    );
  } catch (e) {
    return NextResponse.json({ ok: false, error: e?.message || "Bootstrap failed." }, { status: 500 });
  }
}
