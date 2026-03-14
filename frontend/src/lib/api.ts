import axios from 'axios';

const API_URL = typeof window !== 'undefined' ? '' : (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000');

const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
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
