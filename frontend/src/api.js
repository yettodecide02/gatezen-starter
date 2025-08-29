// Simple fetch wrapper that points to your backend API
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

/**
 * api("/announcements")          -> GET
 * api("/announcements", { method:"POST", body: JSON.stringify({...}) })
 */
export async function api(path, opts = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    method: opts.method || "GET",
    headers: {
      "Content-Type": "application/json",
      ...(opts.headers || {}),
    },
    body: opts.body,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || res.statusText);
  }
  return res.json();
}

export { API_URL };
