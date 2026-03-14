import axios from 'axios';

// Reads the backend URL injected by layout.tsx at runtime.
// Falls back to env var in SSR or empty string if meta tag is missing.
export function getBackendUrl(): string {
  if (typeof window === 'undefined') return process.env.BACKEND_URL || 'http://localhost:8000';
  const meta = document.querySelector('meta[name="backend-url"]');
  return meta?.getAttribute('content') || '';
}

export const API_URL = getBackendUrl();

const api = axios.create({
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  // Resolve backend URL lazily so it's always current
  config.baseURL = `${getBackendUrl()}/api`;
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('ws_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('ws_token');
      localStorage.removeItem('ws_user');
    }
    return Promise.reject(err);
  }
);

export default api;
export { API_URL };
