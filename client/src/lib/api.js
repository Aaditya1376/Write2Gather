// One place that talks to the backend.
// - The access token lives only in memory (a JS variable), never in localStorage, so XSS cannot steal it.
// - If a request gets 401 (token expired), we silently ask /refresh for a new token (using the
//   HttpOnly cookie) and retry the request once.

export const BASE = import.meta.env.VITE_API_URL || "";

let accessToken = null;
export const getToken = () => accessToken;
export const setToken = (t) => {
  accessToken = t;
};

export class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

let refreshing = null; // share one refresh call if many requests fail at the same moment
export function refreshSession() {
  if (!refreshing) {
    refreshing = fetch(`${BASE}/api/auth/refresh`, { method: "POST", credentials: "include" })
      .then(async (res) => {
        if (!res.ok) throw new ApiError(res.status, "Not logged in");
        const data = await res.json();
        accessToken = data.accessToken;
        return data;
      })
      .finally(() => {
        refreshing = null;
      });
  }
  return refreshing;
}

let onSessionLost = () => {};
export const setSessionLostHandler = (fn) => {
  onSessionLost = fn;
};

async function send(path, { method = "GET", body, retry = true } = {}) {
  const headers = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

  let res;
  try {
    res = await fetch(`${BASE}${path}`, {
      method,
      headers,
      credentials: "include",
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(0, "Cannot reach the server. Is it running?");
  }

  if (res.status === 401 && retry && !path.startsWith("/api/auth/")) {
    try {
      await refreshSession();
    } catch {
      onSessionLost();
      throw new ApiError(401, "Session expired, please log in again");
    }
    return send(path, { method, body, retry: false });
  }
  return res;
}

async function request(path, options) {
  const res = await send(path, options);
  let data = null;
  try {
    data = await res.json();
  } catch {
    /* empty body */
  }
  if (!res.ok) throw new ApiError(res.status, data?.error || "Something went wrong");
  return data;
}

export const api = {
  get: (path) => request(path),
  post: (path, body) => request(path, { method: "POST", body: body ?? {} }),
  patch: (path, body) => request(path, { method: "PATCH", body }),
  delete: (path) => request(path, { method: "DELETE" }),
  // For streaming responses (AI): returns the raw Response so the caller can read the body.
  stream: (path, body) => send(path, { method: "POST", body }),
};
