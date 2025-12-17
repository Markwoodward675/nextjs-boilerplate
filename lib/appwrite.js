// lib/appwrite.js
"use client";

import { Client, Account, Databases, Storage, ID, Query } from "appwrite";

const ENDPOINT = (process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || "").trim();
const PROJECT_ID = (process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || "").trim();

export const isAppwriteConfigured =
  Boolean(ENDPOINT) && ENDPOINT.startsWith("http") && Boolean(PROJECT_ID);


export function assertAppwriteConfigured() {
  if (!isAppwriteConfigured) {
    throw new Error(
      "Appwrite is not configured. Set NEXT_PUBLIC_APPWRITE_ENDPOINT and NEXT_PUBLIC_APPWRITE_PROJECT_ID."
    );
  }
}

export const client = new Client();

// Only set config if available (prevents runtime crashes)
if (isAppwriteConfigured) {
  client.setEndpoint(ENDPOINT).setProject(PROJECT_ID);
}

export const account = new Account(client);
export const databases = new Databases(client);
export const storage = new Storage(client);

export { ID, Query };

// Add this near the bottom of lib/appwrite.js (after export const account = ...)

export async function createEmailSessionCompat(email, password) {
  const e = String(email || "").trim();
  const p = String(password || "");

  // Appwrite SDK versions differ. Support all common names:
  if (typeof account.createEmailPasswordSession === "function") {
    return account.createEmailPasswordSession(e, p);
  }
  if (typeof account.createEmailSession === "function") {
    return account.createEmailSession(e, p);
  }
  if (typeof account.createSession === "function") {
    return account.createSession(e, p);
  }

  throw new Error(
    "Appwrite SDK mismatch: no email session method found (createEmailPasswordSession/createEmailSession/createSession)."
  );
}

// Debug (safe)
if (typeof window !== "undefined") {
  // Avoid logging sensitive values (these are public, but still keep it clean)
  console.log("[Appwrite public config]", {
    endpointConfigured: Boolean(ENDPOINT),
    projectConfigured: Boolean(PROJECT_ID),
    isAppwriteConfigured,
  });
}
