// lib/api.js (replace only ensureUserBootstrap, keep the rest of your file)
import { getAccount } from "./appwriteClient";

export async function ensureUserBootstrap(extra = {}) {
  // ✅ Must be signed in in the browser first
  const account = getAccount();

  let me = null;
  try {
    me = await account.get();
  } catch (e) {
    throw new Error("Not signed in.");
  }

  // ✅ Create JWT from current session
  const jwtObj = await account.createJWT();
  const jwt = jwtObj?.jwt;
  if (!jwt) throw new Error("Unable to create JWT.");

  const res = await fetch("/api/bootstrap", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${jwt}`,
    },
    cache: "no-store",
    body: JSON.stringify({ ...extra, userId: me.$id }), // ✅ your requested shape
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data?.ok) {
    throw new Error(data?.error || "Bootstrap failed.");
  }
  return data;
}
