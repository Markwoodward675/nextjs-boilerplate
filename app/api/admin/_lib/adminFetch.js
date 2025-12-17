export async function adminFetch(url, options = {}) {
  const jwt = localStorage.getItem("dt_admin_jwt") || "";
  const headers = new Headers(options.headers || {});
  headers.set("x-admin-jwt", jwt);

  const res = await fetch(url, {
    ...options,
    headers,
    cache: "no-store",
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || "Admin request failed.");
  return data;
}
