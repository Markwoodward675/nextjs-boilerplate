import { NextResponse } from "next/server";
import { getAdminClient, requireAdminKey } from "../../../../lib/appwriteAdmin";

const DB_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID;
const USERS = process.env.NEXT_PUBLIC_APPWRITE_USERS_COLLECTION_ID || "user_profile";

export async function POST(req) {
  try {
    requireAdminKey(req);
    const { userId, status } = await req.json();
    if (!userId || !status) return NextResponse.json({ error: "Missing userId/status" }, { status: 400 });

    const { db } = getAdminClient();

    const updated = await db.updateDocument(DB_ID, USERS, userId, {
      kycStatus: status, // approved | rejected | pending
      updatedAt: new Date().toISOString(),
    });

    return NextResponse.json({ ok: true, updated });
  } catch (e) {
    return NextResponse.json({ error: e.message || "Admin error" }, { status: e.status || 500 });
  }
}
