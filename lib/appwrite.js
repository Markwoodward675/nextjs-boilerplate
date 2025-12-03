// lib/appwrite.js
import { Client, Account, Databases, ID, Query } from "appwrite";

const client = new Client();

const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT;
const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;

if (!endpoint || !projectId) {
  // This will appear in the browser console if something is missing
  console.warn(
    "Appwrite is not fully configured. Check NEXT_PUBLIC_APPWRITE_ENDPOINT and NEXT_PUBLIC_APPWRITE_PROJECT_ID."
  );
}

client.setEndpoint(endpoint).setProject(projectId);

export const account = new Account(client);
export const databases = new Databases(client);
export const IDHelper = ID;
export const QueryHelper = Query;

// Database ID from env (e.g. Daytrader_main)
export const DB_ID = process.env.NEXT_PUBLIC_APPWRITE_DB_ID;
