export async function adminFetch(url, options = {}) {
  const jwt = typeof window !== "undefined" ? localStorage.getItem("dt_admin_jwt") || "" : "";
  const headers = new Headers(options.headers || {});
  if (jwt) headers.set("x-admin-jwt", jwt);

  const res = await fetch(url, {
    ...options,
    headers,
    cache: "no-store",
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
