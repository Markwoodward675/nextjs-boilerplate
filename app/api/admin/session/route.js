import { NextResponse } from "next/server";
import { requireAdminAuth } from "../../../../lib/appwriteAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req) {
  try {
    // Temporarily allow auth check without cookie for this endpoint:
    const jwt = req.headers.get("x-admin-jwt") || "";
    if (!jwt) return NextResponse.json({ error: "Missing admin JWT." }, { status: 401 });

    // Validate JWT + allowlist using helper directly
    // (We can’t call requireAdminAuth here because it requires cookie.)
    const { getUserFromAppwriteJWT } = await import("../../../../lib/appwriteAdmin");
    const user = await getUserFromAppwriteJWT(jwt);

    const allowedEmails = String(process.env.ADMIN_ALLOWED_EMAILS || "")
      .split(",").map(s => s.trim().toLowerCase()).filter(Boolean);
    const allowedUserIds = String(process.env.ADMIN_ALLOWED_USER_IDS || "")
      .split(",").map(s => s.trim()).filter(Boolean);

    const ok =
      (allowedEmails.length && allowedEmails.includes(String(user?.email || "").toLowerCase())) ||
      (allowedUserIds.length && allowedUserIds.includes(String(user?.$id || "")));

    if (!ok) return NextResponse.json({ error: "Not authorized as admin." }, { status: 403 });

    const res = NextResponse.json({ ok: true });

    res.cookies.set("dt_admin", "1", {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 8, // 8 hours
    });

    return res;
  } catch (e) {
    return NextResponse.json({ error: e?.message || "Admin session failed." }, { status: 500 });
  }
}
