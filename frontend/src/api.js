const API_BASE = "http://127.0.0.1:8000/api/v1";

export const activeSessionStorageKey =
  "smart_attendance_active_session_id";

export const apiUrl = (path) =>
  `${API_BASE}${path.startsWith("/") ? path : `/${path}`}`;

export function normalizeList(value) {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.items)) return value.items;
  if (Array.isArray(value?.data)) return value.data;
  return [];
}

function formatDetail(detail) {
  if (Array.isArray(detail)) {
    return detail
      .map((item) => {
        if (typeof item === "string") return item;

        const field = Array.isArray(item?.loc)
          ? item.loc.join(".")
          : "request";

        return `${field}: ${item?.msg || JSON.stringify(item)}`;
      })
      .join("; ");
  }

  if (typeof detail === "string") return detail;

  if (detail != null) {
    return JSON.stringify(detail);
  }

  return "Unknown server error";
}

export async function apiRequest(path, options = {}) {
  const method = options.method || "GET";
  const url = apiUrl(path);

  let response;

  try {
    response = await fetch(url, {
      ...options,
      headers: {
        Accept: "application/json",

        ...(options.body !== undefined &&
        !(options.body instanceof FormData)
          ? { "Content-Type": "application/json" }
          : {}),

        ...(options.headers || {}),
      },
    });
  } catch {
    throw new Error(
      `Network error — ${method} ${path}. ` +
      "Is FastAPI running on 127.0.0.1:8000?"
    );
  }

  const contentType =
    response.headers.get("content-type") || "";

  let data = null;

  try {
    if (response.status !== 204) {
      if (contentType.includes("application/json")) {
        data = await response.json();
      } else {
        const text = await response.text();
        data = text || null;
      }
    }
  } catch {
    data = null;
  }

  if (!response.ok) {
    const detail = formatDetail(data?.detail ?? data);

    throw new Error(
      `${method} ${path} failed (${response.status}): ${detail}`
    );
  }

  return data;
}

export const api = {
  get: (path, options = {}) =>
    apiRequest(path, {
      ...options,
      method: "GET",
    }),

  post: (path, body, options = {}) =>
    apiRequest(path, {
      ...options,
      method: "POST",
      body:
        body instanceof FormData
          ? body
          : JSON.stringify(body),
    }),

  put: (path, body, options = {}) =>
    apiRequest(path, {
      ...options,
      method: "PUT",
      body:
        body instanceof FormData
          ? body
          : JSON.stringify(body),
    }),

  patch: (path, body, options = {}) =>
    apiRequest(path, {
      ...options,
      method: "PATCH",
      body:
        body instanceof FormData
          ? body
          : JSON.stringify(body),
    }),

  delete: (path, options = {}) =>
    apiRequest(path, {
      ...options,
      method: "DELETE",
    }),
};