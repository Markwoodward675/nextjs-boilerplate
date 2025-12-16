import { NextResponse } from "next/server";
import { getAdmin } from "../../../../lib/appwriteAdmin";
import { ID } from "node-appwrite";

const COL_USER_PROFILE = "user_profile";
const BUCKET = process.env.NEXT_PUBLIC_APPWRITE_BUCKET_ID || "uploads";

export async function POST(req) {
  try {
    const { db, storage, DATABASE_ID } = getAdmin();
    const form = await req.formData();
    const userId = String(form.get("userId") || "");
    const file = form.get("file");

    if (!userId || !file) return NextResponse.json({ ok: false, error: "Missing userId/file." }, { status: 400 });

    const uploaded = await storage.createFile(BUCKET, ID.unique(), file);

    // ensure doc exists
    const exists = await db.getDocument(DATABASE_ID, COL_USER_PROFILE, userId).catch(() => null);
    if (!exists) {
      await db.createDocument(DATABASE_ID, COL_USER_PROFILE, userId, {
        userId,
        fullName: "",
        kycStatus: "not_submitted",
        verificationCodeVerified: false,
        profileImageFileId: uploaded.$id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    } else {
      await db.updateDocument(DATABASE_ID, COL_USER_PROFILE, userId, {
        profileImageFileId: uploaded.$id,
        updatedAt: new Date().toISOString(),
      });
    }

    return NextResponse.json({ ok: true, fileId: uploaded.$id });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e?.message || "Server error" }, { status: 500 });
  }
}
