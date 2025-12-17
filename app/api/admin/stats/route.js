import { NextResponse } from "next/server";
import { getAdmin, requireAdminKey } from "@/lib/appwriteAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req) {
  try {
    requireAdminKey(req);

    const { db, users, DATABASE_ID, Query } = getAdmin();

    const [
      u,
      profiles,
      wallets,
      transactions,
      alerts,
    ] = await Promise.all([
      // users.list signature varies by SDK version; fallback if needed
      (async () => {
        try {
          const r = await users.list();
          return r?.total ?? (r?.users?.length ?? 0);
        } catch {
          return 0;
        }
      })(),
      db.listDocuments(DATABASE_ID, "profiles", [Query.limit(1)]),
      db.listDocuments(DATABASE_ID, "wallets", [Query.limit(1)]),
      db.listDocuments(DATABASE_ID, "transactions", [Query.limit(1)]),
      db.listDocuments(DATABASE_ID, "alerts", [Query.limit(1)]),
    ]);

    return NextResponse.json({
      users: u,
      profiles: profiles?.total ?? 0,
      wallets: wallets?.total ?? 0,
      transactions: transactions?.total ?? 0,
      alerts: alerts?.total ?? 0,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e?.message || "Failed to load stats." },
      { status: e?.status || 500 }
    );
  }
}
