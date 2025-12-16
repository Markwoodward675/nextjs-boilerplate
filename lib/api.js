"use client";

import { Client, Account, Databases, Storage, ID, Query } from "appwrite";

const client = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID);

export const account = new Account(client);
export const databases = new Databases(client);
export const storage = new Storage(client);

export const DB_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID;
export const BUCKET_ID = process.env.NEXT_PUBLIC_APPWRITE_BUCKET_ID;

/* ---------------- AUTH ---------------- */

export async function signIn(email, password) {
  return account.createEmailSession(email, password);
}

export async function signUp(email, password, name) {
  await account.create(ID.unique(), email, password, name);
  return signIn(email, password);
}

export async function signOut() {
  try {
    await account.deleteSession("current");
  } catch {}
}

export async function logoutUser() {
  return signOut();
}

/* ---------------- BOOTSTRAP ---------------- */

export async function ensureUserBootstrap() {
  const user = await account.get();

  const profileRes = await databases.listDocuments(
    DB_ID,
    "profiles",
    [Query.equal("userId", user.$id)]
  );

  const profile = profileRes.documents[0] || null;

  return { user, profile };
}

/* ---------------- VERIFY CODE ---------------- */

export async function createOrRefreshVerifyCode(userId) {
  return databases.createDocument(
    DB_ID,
    "verify_codes",
    ID.unique(),
    {
      userId,
      code: String(Math.floor(100000 + Math.random() * 900000)),
      used: false,
    }
  );
}

export async function verifySixDigitCode(userId, code) {
  const res = await databases.listDocuments(
    DB_ID,
    "verify_codes",
    [
      Query.equal("userId", userId),
      Query.equal("code", code),
      Query.equal("used", false),
    ]
  );

  if (!res.documents.length) {
    throw new Error("Invalid or expired code");
  }

  const doc = res.documents[0];

  await databases.updateDocument(
    DB_ID,
    "verify_codes",
    doc.$id,
    { used: true }
  );

  await databases.updateDocument(
    DB_ID,
    "profiles",
    userId,
    { verificationCodeVerified: true }
  );
}

/* ---------------- PASSWORD RECOVERY ---------------- */

export async function sendPasswordRecovery(email) {
  return account.createRecovery(
    email,
    `${window.location.origin}/reset-password`
  );
}

export async function resetPasswordWithRecovery(userId, secret, password) {
  return account.updateRecovery(userId, secret, password, password);
}

/* ---------------- HELPERS ---------------- */

export function getErrorMessage(err, fallback = "Something went wrong") {
  return err?.message || fallback;
}
