import { getAccessToken } from "./auth.js";

/**
 * Fetch wrapper that automatically adds the JWT.
 * Throws on non-2xx responses with the server's error message.
 */
export async function apiFetch(path, options = {}) {
  const token = await getAccessToken();

  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(path, {
    ...options,
    headers,
  });

  // 204 No Content — nothing to parse
  if (res.status === 204) return null;

  const text = await res.text();
  let body;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }

  if (!res.ok) {
    const message =
      (body && typeof body === "object" && body.error) ||
      `Request failed (${res.status})`;
    const err = new Error(message);
    err.status = res.status;
    err.body = body;
    throw err;
  }

  return body;
}

/* ---------- Categories ---------- */
export const categoriesApi = {
  list: () => apiFetch("/api/categories"),
  create: (data) =>
    apiFetch("/api/categories", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  update: (id, data) =>
    apiFetch(`/api/categories/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  delete: (id, replaceWith) => {
    const qs = replaceWith ? `?replaceWith=${replaceWith}` : "";
    return apiFetch(`/api/categories/${id}${qs}`, { method: "DELETE" });
  },
};

/* ---------- Transactions ---------- */
export const transactionsApi = {
  list: (params = {}) => {
    const qs = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v != null && v !== ""),
    ).toString();
    return apiFetch(`/api/transactions${qs ? `?${qs}` : ""}`);
  },
  get: (id) => apiFetch(`/api/transactions/${id}`),
  createManual: (data) =>
    apiFetch("/api/transactions/manual", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  update: (id, data) =>
    apiFetch(`/api/transactions/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  delete: (id) => apiFetch(`/api/transactions/${id}`, { method: "DELETE" }),
};
/* ---------- Receipts ---------- */
export const receiptsApi = {
  upload: async ({ file, categoryId, note, paymentSource, force }) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("categoryId", categoryId);
    if (note) formData.append("note", note);
    if (paymentSource) formData.append("paymentSource", paymentSource);
    if (force) formData.append("force", "true");

    // Don't set Content-Type — the browser sets it with the boundary
    const token = await getAccessToken();
    const res = await fetch("/api/transactions/receipt", {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });

    if (res.status === 204) return null;
    const body = await res.json().catch(() => null);

    if (!res.ok) {
      const err = new Error(body?.error || `Upload failed (${res.status})`);
      err.status = res.status;
      err.body = body;
      throw err;
    }
    return body;
  },

  retry: (id) => apiFetch(`/api/transactions/${id}/retry`, { method: "POST" }),
  resolve: (id) =>
    apiFetch(`/api/transactions/${id}/resolve`, { method: "POST" }),
};
