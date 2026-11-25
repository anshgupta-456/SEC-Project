// Thin fetch wrapper for the three backend services.
//
// Every service lives under /api/<service>. By default requests are relative,
// which works with the Vite dev proxy (vite.config.js) and when the backend
// serves the built frontend itself (backend/wsgi.py). To host the frontend
// separately (Vercel, Netlify...), set VITE_API_URL to the backend's origin.
const ORIGIN = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '');

export const API_BASE = {
  user: `${ORIGIN}/api/user`,
  grievance: `${ORIGIN}/api/grievance`,
  admin: `${ORIGIN}/api/admin`,
};

export const SESSION_KEY = 'grievance_session';

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

let unauthorizedHandler = null;
export function setUnauthorizedHandler(handler) {
  unauthorizedHandler = handler;
}

function currentToken() {
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY))?.token || null;
  } catch {
    return null;
  }
}

/**
 * Call a backend endpoint.
 * @param {'user'|'grievance'|'admin'} service
 * @param {string} path e.g. "/login"
 * @param {{method?: string, json?: any, formData?: FormData, auth?: boolean, raw?: boolean}} options
 */
export async function apiRequest(service, path, { method = 'GET', json, formData, auth = true, raw = false } = {}) {
  const headers = {};
  let body;
  if (json !== undefined) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(json);
  } else if (formData) {
    body = formData;
  }
  const token = auth ? currentToken() : null;
  if (token) headers.Authorization = `Bearer ${token}`;

  let response;
  try {
    response = await fetch(`${API_BASE[service]}${path}`, { method, headers, body });
  } catch {
    throw new ApiError('Cannot reach the server. Make sure the backend is running.', 0);
  }

  if (raw && response.ok) return response;

  const isJson = (response.headers.get('content-type') || '').includes('application/json');
  const data = isJson ? await response.json().catch(() => null) : null;

  if (!response.ok) {
    if (response.status === 401 && token && unauthorizedHandler) unauthorizedHandler();
    throw new ApiError(data?.message || `Request failed (${response.status})`, response.status);
  }
  return data;
}

export const api = {
  get: (service, path) => apiRequest(service, path),
  post: (service, path, json, options = {}) => apiRequest(service, path, { method: 'POST', json, ...options }),
  put: (service, path, json) => apiRequest(service, path, { method: 'PUT', json }),
  upload: (service, path, formData) => apiRequest(service, path, { method: 'POST', formData }),
  blob: async (service, path) => (await apiRequest(service, path, { raw: true })).blob(),
};
