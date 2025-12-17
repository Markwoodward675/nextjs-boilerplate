// lib/appwrite.js
"use client";

import { Client, Account, Databases, Storage, ID, Query } from "appwrite";

const ENDPOINT = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || "";
const PROJECT_ID = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || "";

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

// Debug (safe)
if (typeof window !== "undefined") {
  // Avoid logging sensitive values (these are public, but still keep it clean)
  console.log("[Appwrite public config]", {
    endpointConfigured: Boolean(ENDPOINT),
    projectConfigured: Boolean(PROJECT_ID),
    isAppwriteConfigured,
  });
}
