const API_BASE =
  (import.meta.env.VITE_API_BASE_URL && String(import.meta.env.VITE_API_BASE_URL).replace(/\/$/, "")) ||
  "http://127.0.0.1:8000";

const TOKEN_KEY = "taskboard_token";

export function getStoredToken() {
  try {
    return sessionStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setStoredToken(token) {
  try {
    if (token) sessionStorage.setItem(TOKEN_KEY, token);
    else sessionStorage.removeItem(TOKEN_KEY);
  } catch {
    /* ignore quota / private mode */
  }
}

function buildHeaders({ json, token, auth } = {}) {
  const headers = new Headers();
  if (json) headers.set("Content-Type", "application/json");
  const t = auth === false ? null : token ?? getStoredToken();
  if (t) headers.set("Authorization", `Bearer ${t}`);
  return headers;
}

/**
 * Typed-ish API wrapper: always validates response status, avoids mixing HTML errors with JSON.
 */
export async function apiFetch(path, options = {}) {
  const { method = "GET", body, json, token, signal, auth } = options;
  const url = `${API_BASE}${path.startsWith("/") ? path : `/${path}`}`;
  const init = {
    method,
    headers: buildHeaders({ json: Boolean(json || body), token, auth }),
    signal,
    cache: "no-store",
  };
  if (body !== undefined) {
    init.body = typeof body === "string" ? body : JSON.stringify(body);
  }

  let res;
  try {
    res = await fetch(url, init);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Network error";
    throw new Error(`Request failed: ${message}`);
  }

  const contentType = res.headers.get("content-type") || "";
  const isJson = contentType.includes("application/json");
  let data = null;
  const text = await res.text();
  if (text) {
    if (isJson) {
      try {
        data = JSON.parse(text);
      } catch {
        throw new Error("Invalid JSON from server");
      }
    }
  }

  if (!res.ok) {
    const detail =
      data && typeof data === "object" && "detail" in data
        ? formatDetail(data.detail)
        : text.slice(0, 200) || res.statusText;
    const err = new Error(detail || `HTTP ${res.status}`);
    err.status = res.status;
    err.data = data;
    throw err;
  }

  return { status: res.status, data };
}

function formatDetail(detail) {
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    return detail
      .map((d) => (d && typeof d.msg === "string" ? d.msg : JSON.stringify(d)))
      .join("; ");
  }
  return JSON.stringify(detail);
}

/**
 * Multipart upload: do not set Content-Type manually (browser sets boundary).
 */
export async function apiUpload(path, file, { token, signal } = {}) {
  const url = `${API_BASE}${path.startsWith("/") ? path : `/${path}`}`;
  const headers = new Headers();
  const t = token ?? getStoredToken();
  if (t) headers.set("Authorization", `Bearer ${t}`);

  const form = new FormData();
  form.append("file", file, file.name);

  let res;
  try {
    res = await fetch(url, { method: "POST", headers, body: form, signal, cache: "no-store" });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Network error";
    throw new Error(`Request failed: ${message}`);
  }

  const contentType = res.headers.get("content-type") || "";
  const isJson = contentType.includes("application/json");
  const text = await res.text();
  let data = null;
  if (text && isJson) {
    try {
      data = JSON.parse(text);
    } catch {
      throw new Error("Invalid JSON from server");
    }
  }

  if (!res.ok) {
    const detail =
      data && typeof data === "object" && "detail" in data ? formatDetail(data.detail) : text.slice(0, 200) || res.statusText;
    const err = new Error(detail || `HTTP ${res.status}`);
    err.status = res.status;
    err.data = data;
    throw err;
  }

  return { status: res.status, data };
}
