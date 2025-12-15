import { Client, Databases, Storage, Users, ID } from "node-appwrite";

export function getAdminClient() {
  const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT;
  const project = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;
  const apiKey = process.env.APPWRITE_API_KEY;

  if (!endpoint || !project || !apiKey) {
    throw new Error("Missing admin env vars: ENDPOINT/PROJECT_ID/APPWRITE_API_KEY");
  }

  const client = new Client()
    .setEndpoint(endpoint)
    .setProject(project)
    .setKey(apiKey);

  return {
    client,
    db: new Databases(client),
    storage: new Storage(client),
    users: new Users(client),
    ID,
  };
}

export function requireAdminKey(req) {
  const key = req.headers.get("x-admin-key") || "";
  if (!process.env.ADMIN_PANEL_KEY) throw new Error("ADMIN_PANEL_KEY not configured");
  if (key !== process.env.ADMIN_PANEL_KEY) {
    const e = new Error("Unauthorized admin");
    e.status = 401;
    throw e;
  }
}
