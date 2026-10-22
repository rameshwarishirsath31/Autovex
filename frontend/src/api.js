const API_BASE = 'http://localhost:8000';

export function getToken() {
  return localStorage.getItem('autovex_token');
}

export function setToken(token) {
  localStorage.setItem('autovex_token', token);
}

export function removeToken() {
  localStorage.removeItem('autovex_token');
}

export async function apiFetch(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const token = getToken();

  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    // If unauthorized, clear token
    // removeToken();
  }

  if (!response.ok) {
    let errorDetail = 'API request failed';
    try {
      const errJson = await response.json();
      errorDetail = errJson.detail || JSON.stringify(errJson);
    } catch (e) {
      errorDetail = response.statusText;
    }
    throw new Error(errorDetail);
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

// Auth
export const authApi = {
  login: (email, password) => apiFetch('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  }),
  register: (name, email, password) => apiFetch('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ name, email, password }),
  }),
  getMe: () => apiFetch('/auth/me'),
};

// Vehicles
export const vehicleApi = {
  getAll: () => apiFetch('/vehicles'),
  getById: (id) => apiFetch(`/vehicles/${id}`),
  create: (data) => apiFetch('/vehicles', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  update: (id, data) => apiFetch(`/vehicles/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  delete: (id) => apiFetch(`/vehicles/${id}`, {
    method: 'DELETE',
  }),
  getHealthScore: (id) => apiFetch(`/vehicles/${id}/health-score`),
  getSchedule: (id) => apiFetch(`/vehicles/${id}/schedule`),
  getServiceRecords: (id) => apiFetch(`/vehicles/${id}/service-records`),
  createServiceRecord: (id, data) => apiFetch(`/vehicles/${id}/service-records`, {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  getComponentHistory: (id) => apiFetch(`/vehicles/${id}/component-history`),
  createComponentHistory: (id, data) => apiFetch(`/vehicles/${id}/component-history`, {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  getDTC: (id) => apiFetch(`/vehicles/${id}/dtc`),
  addDTC: (id, data) => apiFetch(`/vehicles/${id}/dtc`, {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  clearDTC: (vehicleId, dtcId) => apiFetch(`/vehicles/${vehicleId}/dtc/${dtcId}/clear`, {
    method: 'PATCH',
  }),
};

// Predictions
export const predictionApi = {
  run: (vehicleId) => apiFetch(`/predictions/${vehicleId}/run`, {
    method: 'POST',
  }),
  getLatest: (vehicleId) => apiFetch(`/predictions/${vehicleId}/latest`),
};

// Telemetry & OBD
export const obdApi = {
  getLatest: (vehicleId) => apiFetch(`/obd/${vehicleId}/latest`),
  getHistory: (vehicleId, limit = 40) => apiFetch(`/obd/${vehicleId}/history?limit=${limit}`),
  startSim: (vehicleId) => apiFetch(`/obd/${vehicleId}/simulate/start`, { method: 'POST' }),
  stopSim: (vehicleId) => apiFetch(`/obd/${vehicleId}/simulate/stop`, { method: 'POST' }),
  getSimStatus: (vehicleId) => apiFetch(`/obd/${vehicleId}/simulate/status`),
};

// Reminders
export const reminderApi = {
  getAll: (vehicleId) => apiFetch(`/reminders${vehicleId ? `?vehicle_id=${vehicleId}` : ''}`),
  create: (vehicleId, data) => apiFetch(`/reminders?vehicle_id=${vehicleId}`, {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  update: (id, data) => apiFetch(`/reminders/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  }),
  delete: (id) => apiFetch(`/reminders/${id}`, {
    method: 'DELETE',
  }),
};

// Reports
export const reportApi = {
  getSummary: (vehicleId) => apiFetch(`/reports/${vehicleId}/summary`),
  getExportUrl: (vehicleId) => `${API_BASE}/reports/${vehicleId}/export-csv`,
};
