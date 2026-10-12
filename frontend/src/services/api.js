// All HTTP access lives here. Every failure becomes an ApiError with a readable message.

// In development Vite proxies /api, so an empty VITE_API_URL is fine. In production
// (e.g. a Render Static Site) the backend must be served from another origin, so
// VITE_API_URL must point at it, and the build replaces this value at build time.
const API_BASE = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "") + "/api/v1";

export class ApiError extends Error {
  constructor(message, { code = "unknown", status = 0, details = [] } = {}) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

async function request(path, { method = "GET", body, timeout = 15000 } = {}) {
  // In production (a deployed site) VITE_API_URL must point at the backend;
  // an empty value means this deployment isn't wired to an API.
  const target =
    import.meta.env.PROD && !import.meta.env.VITE_API_URL
      ? undefined
      : API_BASE + path;

  if (!target) {
    throw new ApiError(
      "The API service is not configured for this site. Set VITE_API_URL " +
        "(for example https://your-api.onrender.com) and rebuild the frontend, " +
        "then refresh the page.",
      { code: "not_configured" }
    );
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  let res;
  try {
    res = await fetch(target, {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
  } catch (err) {
    if (err.name === "AbortError") {
      throw new ApiError("The request took too long. Try again.", { code: "timeout" });
    }
    throw new ApiError(
      "Can't reach the GrowMate server. Check that the backend is running on port 8000.",
      { code: "network" }
    );
  } finally {
    clearTimeout(timer);
  }

  if (res.status === 204) return null;

  let data = null;
  try {
    data = await res.json();
  } catch {
    /* non-JSON body */
  }

  if (!res.ok) {
    const err = data?.error;
    throw new ApiError(err?.message || `Request failed (${res.status}).`, {
      code: err?.code || `http_${res.status}`,
      status: res.status,
      details: err?.details || [],
    });
  }
  return data;
}

const AI_TIMEOUT = 200000; // local models can be slow on CPU

export const api = {
  health: () => request("/health", { timeout: 6000 }),

  getGarden: async () => {
    try {
      return await request("/garden");
    } catch (e) {
      if (e.status === 404) return null; // no profile yet is a normal state
      throw e;
    }
  },
  saveGarden: (body) => request("/garden", { method: "PUT", body }),

  listPlants: () => request("/plants"),
  getPlant: (id) => request(`/plants/${id}`),
  createPlant: (body) => request("/plants", { method: "POST", body }),
  deletePlant: (id) => request(`/plants/${id}`, { method: "DELETE" }),

  listTasks: ({ status = "all", plantId } = {}) =>
    request(`/tasks?status=${status}${plantId ? `&plant_id=${plantId}` : ""}`),
  createTask: (body) => request("/tasks", { method: "POST", body }),
  updateTask: (id, body) => request(`/tasks/${id}`, { method: "PATCH", body }),
  deleteTask: (id) => request(`/tasks/${id}`, { method: "DELETE" }),

  listJournal: ({ plantId } = {}) => request(`/journal${plantId ? `?plant_id=${plantId}` : ""}`),
  createEntry: (body) => request("/journal", { method: "POST", body }),

  planPlanting: (body) =>
    request("/ai/planting-plan", { method: "POST", body, timeout: AI_TIMEOUT }),
  chat: (body) => request("/ai/chat", { method: "POST", body, timeout: AI_TIMEOUT }),

  weather: () => request("/weather", { timeout: 12000 }),
  research: (query) => request("/research", { method: "POST", body: { query }, timeout: 20000 }),
};
