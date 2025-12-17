"use client";

export function getAdminKey() {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("DT_ADMIN_KEY") || "";
}

export function setAdminKey(v) {
  if (typeof window === "undefined") return;
  localStorage.setItem("DT_ADMIN_KEY", String(v || ""));
}

export function clearAdminKey() {
  if (typeof window === "undefined") return;
  localStorage.removeItem("DT_ADMIN_KEY");
}

export async function adminFetch(url, opts = {}) {
  const key = getAdminKey();
  const res = await fetch(url, {
    ...opts,
    headers: {
      "content-type": "application/json",
      ...(opts.headers || {}),
      "x-admin-key": key,
    },
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data?.error || `Request failed (${res.status})`;
    const err = new Error(msg);
    err.status = res.status;
    throw err;
  }
  return data;
}
