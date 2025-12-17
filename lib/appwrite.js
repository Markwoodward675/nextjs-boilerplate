// lib/appwrite.js
"use client";

import { Client, Account, Databases, Storage, ID, Query } from "appwrite";

const ENDPOINT = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT;
const PROJECT_ID = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;

export const isAppwriteConfigured = Boolean(
  ENDPOINT && ENDPOINT.startsWith("http") && PROJECT_ID
);

if (typeof window !== "undefined") {
  console.log("[Appwrite public config]", { ENDPOINT, PROJECT_ID, isAppwriteConfigured });
}

export const client = new Client();

if (isAppwriteConfigured) {
  client.setEndpoint(ENDPOINT).setProject(PROJECT_ID);
}

export const account = new Account(client);
export const databases = new Databases(client);
export const storage = new Storage(client);

export { ID, Query };
