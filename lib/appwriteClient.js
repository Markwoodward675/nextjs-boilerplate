// lib/appwriteClient.js
"use client";

import { Client, Account, Databases, Storage } from "appwrite";

let _client = null;
let _account = null;
let _db = null;
let _storage = null;

function readPublicEnv() {
  const ENDPOINT = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || "";
  const PROJECT_ID = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || "";
  const DATABASE_ID =
    process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID ||
    process.env.NEXT_PUBLIC_APPWRITE_DB_ID ||
    "";
  const BUCKET_ID = process.env.NEXT_PUBLIC_APPWRITE_BUCKET_ID || "";
  return { ENDPOINT, PROJECT_ID, DATABASE_ID, BUCKET_ID };
}

export function isAppwriteConfigured() {
  const { ENDPOINT, PROJECT_ID } = readPublicEnv();
  return Boolean(ENDPOINT && PROJECT_ID);
}

export function getClient() {
  const { ENDPOINT, PROJECT_ID } = readPublicEnv();
  if (!ENDPOINT || !PROJECT_ID) {
    throw new Error("Appwrite is not configured. Set NEXT_PUBLIC_APPWRITE_ENDPOINT and NEXT_PUBLIC_APPWRITE_PROJECT_ID.");
  }
  if (_client) return _client;

  _client = new Client().setEndpoint(ENDPOINT).setProject(PROJECT_ID);
  return _client;
}

export function getAccount() {
  if (_account) return _account;
  _account = new Account(getClient());
  return _account;
}

export function getDb() {
  if (_db) return _db;
  _db = new Databases(getClient());
  return _db;
}

export function getStorage() {
  if (_storage) return _storage;
  _storage = new Storage(getClient());
  return _storage;
}

export function getPublicConfig() {
  return readPublicEnv();
}
