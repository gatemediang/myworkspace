import axios from 'axios';

// Reads the backend URL injected by layout.tsx at runtime via window.__BACKEND_URL__
export function getBackendUrl(): string {
  if (typeof window === 'undefined') return process.env.BACKEND_URL || 'http://localhost:8000';
  return (window as any).__BACKEND_URL__ || '';
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
