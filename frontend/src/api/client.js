// Cliente HTTP da API com "interceptor" de JWT (plan: Frontend; tasks: T2.1).
//
// Os tokens ficam só em memória: a constituição proíbe guardar token em texto
// plano em qualquer lugar, e localStorage seria exatamente isso. Consequência
// aceita: recarregar a página (F5) exige novo login.

const API_BASE = "/api";

let tokens = { access: null, refresh: null };
let refreshPromise = null;
let onSessionExpired = () => {};

const FIELD_LABELS = {
  username: "Usuário",
  password: "Senha",
  name: "Nome",
  description: "Descrição",
  color: "Cor",
  title: "Título",
  project: "Projeto",
  project_id: "Projeto",
  status: "Status",
  due_date: "Prazo",
  goal_text: "Meta",
  tasks: "Subtarefas",
};

export class ApiError extends Error {
  constructor(status, data, message) {
    super(message ?? describeError(status, data));
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

function firstMessage(value) {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = firstMessage(item);
      if (found) return found;
    }
  } else if (value && typeof value === "object") {
    for (const item of Object.values(value)) {
      const found = firstMessage(item);
      if (found) return found;
    }
  }
  return null;
}

function describeError(status, data) {
  if (data && typeof data === "object") {
    if (typeof data.detail === "string") return data.detail;
    for (const [field, value] of Object.entries(data)) {
      const message = firstMessage(value);
      if (!message) continue;
      const label = FIELD_LABELS[field];
      return label ? `${label}: ${message}` : message;
    }
  }
  if (status >= 500)
    return "O servidor não respondeu como esperado. Tente novamente.";
  return "Não foi possível concluir a ação.";
}

export function setTokens({ access, refresh }) {
  tokens = { access, refresh: refresh ?? tokens.refresh };
}

export function clearTokens() {
  tokens = { access: null, refresh: null };
}

export function setSessionExpiredHandler(handler) {
  onSessionExpired = handler;
}

async function send(path, { method = "GET", body, signal, auth = true }) {
  const headers = { Accept: "application/json" };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (auth && tokens.access) headers.Authorization = `Bearer ${tokens.access}`;

  try {
    return await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal,
    });
  } catch (error) {
    if (error.name === "AbortError") throw error;
    throw new ApiError(0, null, "Sem conexão com o servidor.");
  }
}

async function refreshAccessToken() {
  if (!tokens.refresh) return false;
  refreshPromise ??= (async () => {
    try {
      const response = await send("/auth/refresh/", {
        method: "POST",
        body: { refresh: tokens.refresh },
        auth: false,
      });
      if (!response.ok) return false;
      setTokens(await response.json());
      return true;
    } catch {
      return false;
    } finally {
      refreshPromise = null;
    }
  })();
  return refreshPromise;
}

export async function apiRequest(path, options = {}) {
  const auth = options.auth ?? true;
  let response = await send(path, options);

  if (response.status === 401 && auth) {
    if (await refreshAccessToken()) {
      response = await send(path, options);
    }
    if (response.status === 401) {
      clearTokens();
      onSessionExpired();
    }
  }

  const data =
    response.status === 204 ? null : await response.json().catch(() => null);
  if (!response.ok) throw new ApiError(response.status, data);
  return data;
}

export const api = {
  login: (username, password) =>
    apiRequest("/auth/login/", {
      method: "POST",
      body: { username, password },
      auth: false,
    }),
  register: (username, password) =>
    apiRequest("/auth/register/", {
      method: "POST",
      body: { username, password },
      auth: false,
    }),

  listProjects: () => apiRequest("/projects/"),
  createProject: (project) =>
    apiRequest("/projects/", { method: "POST", body: project }),
  countProjectTasks: (id) =>
    apiRequest(`/projects/${id}/?confirm=false`, { method: "DELETE" }),
  deleteProject: (id) => apiRequest(`/projects/${id}/`, { method: "DELETE" }),

  listTasks: (params = {}) =>
    apiRequest(`/tasks/?${new URLSearchParams(params)}`),
  createTask: (task) => apiRequest("/tasks/", { method: "POST", body: task }),
  updateTask: (id, changes) =>
    apiRequest(`/tasks/${id}/`, { method: "PATCH", body: changes }),
  deleteTask: (id) => apiRequest(`/tasks/${id}/`, { method: "DELETE" }),

  suggestSubtasks: (projectId, goalText, signal) =>
    apiRequest("/ai/breakdown/", {
      method: "POST",
      body: { project_id: projectId, goal_text: goalText },
      signal,
    }),
  confirmSubtasks: (projectId, tasks) =>
    apiRequest("/ai/breakdown/confirm/", {
      method: "POST",
      body: { project_id: projectId, tasks },
    }),
};
