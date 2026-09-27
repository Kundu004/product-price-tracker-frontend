// Base URL of the deployed backend. Set VITE_API_URL in Vercel's env vars
// (or .env.local for local dev) — no hardcoded production URL here, same
// reasoning as the backend's own FRONTEND_URL-driven CORS setup.
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

async function request(path, options = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  const contentType = res.headers.get('content-type') || '';
  const body = contentType.includes('application/json') ? await res.json() : null;
  if (!res.ok) {
    throw new Error(body?.error || `Request failed: ${res.status}`);
  }
  return body;
}

export const api = {
  searchProducts: (q) => request(`/api/products/search?q=${encodeURIComponent(q)}`),
  getItem: (id) => request(`/api/products/${id}`),
  listTracked: () => request('/api/tracked-products'),
  trackProduct: (payload) =>
    request('/api/tracked-products', { method: 'POST', body: JSON.stringify(payload) }),
  untrackProduct: (id) => request(`/api/tracked-products/${id}`, { method: 'DELETE' }),
  getHistory: (id) => request(`/api/tracked-products/${id}/history`),
  getLogs: (id) => request(`/api/tracked-products/${id}/logs`),
  exportCsvUrl: () => `${API_URL}/api/export/csv`,
};
