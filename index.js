import { Client, Databases } from "node-appwrite";
import nodemailer from "nodemailer";

export default async ({ req, res, log, error }) => {
  try {
    const body = req.body ? JSON.parse(req.body) : {};
    const { userId, email } = body;

    if (!userId || !email) {
      return res.json({ ok: false, message: "Missing userId or email" }, 400);
    }

    const code = String(Math.floor(100000 + Math.random() * 900000));
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    const client = new Client()
      .setEndpoint(process.env.APPWRITE_ENDPOINT)
      .setProject(process.env.APPWRITE_PROJECT_ID)
      .setKey(process.env.APPWRITE_API_KEY);

    const db = new Databases(client);

    // Find user's profile doc by userId
    const dbId = process.env.APPWRITE_DB_ID;
    const colId = process.env.APPWRITE_PROFILE_COLLECTION_ID;

    // NOTE: easiest if you store profile docId somewhere; otherwise query listDocuments
    const list = await db.listDocuments(dbId, colId, [
      // works in node-appwrite as Query.equal but simplest: use raw query if needed.
      // If your SDK needs Query helper:
    ]);

    const profile = list.documents.find(d => d.userId === userId);
    if (!profile) {
      return res.json({ ok: false, message: "Profile not found" }, 404);
    }

    await db.updateDocument(dbId, colId, profile.$id, {
      verificationCode: code,
      verificationCodeExpiresAt: expiresAt,
      verificationCodeVerified: false,
      updatedAt: new Date().toISOString(),
    });

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: false,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });

    await transporter.sendMail({
      from: process.env.SMTP_FROM,
      to: email,
      subject: "Your Day Trader verification code",
      text: `Your verification code is ${code}. It expires in 15 minutes.`,
      html: `
        <div style="font-family:Arial,sans-serif;line-height:1.5">
          <h2>Day Trader Verification Code</h2>
          <p>Your verification code is:</p>
          <p style="font-size:28px;font-weight:700;letter-spacing:6px">${code}</p>
          <p>This code expires in <b>15 minutes</b>.</p>
        </div>
      `,
    });

    return res.json({ ok: true, expiresAt });
  } catch (e) {
    return res.json({ ok: false, message: e.message || "Function error" }, 500);
  }
};
