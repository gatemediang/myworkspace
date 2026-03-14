import { create } from 'zustand';
import api from '@/lib/api';

interface User {
  id: number;
  email: string;
  full_name: string;
  role: 'admin' | 'instructor' | 'guest';
  avatar_url?: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  setUser: (user: User | null) => void;
  login: (email: string, password: string) => Promise<void>;
  register: (data: { full_name: string; email: string; password: string; phone?: string }) => Promise<void>;
  logout: () => void;
  hydrate: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isLoading: false,
  setUser: (user) => set({ user }),

  login: async (email, password) => {
    set({ isLoading: true });
    try {
      const formData = new FormData();
      formData.append('username', email);
      formData.append('password', password);
      const res = await api.post('/auth/login', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      const { access_token, user } = res.data;
      localStorage.setItem('ws_token', access_token);
      localStorage.setItem('ws_user', JSON.stringify(user));
      set({ user, token: access_token });
    } catch (err: any) {
      set({ isLoading: false });
      const msg = err?.response?.data?.detail || err?.message || 'Login failed. Please try again.';
      throw new Error(msg);
    } finally {
      set({ isLoading: false });
    }
  },

  register: async (data) => {
    set({ isLoading: true });
    try {
      const res = await api.post('/auth/register', data);
      const { access_token, user } = res.data;
      localStorage.setItem('ws_token', access_token);
      localStorage.setItem('ws_user', JSON.stringify(user));
      set({ user, token: access_token });
    } catch (err: any) {
      set({ isLoading: false });
      const msg = err?.response?.data?.detail || err?.message || 'Sign up failed. Please try again.';
      throw new Error(msg);
    } finally {
      set({ isLoading: false });
    }
  },

  logout: () => {
    localStorage.removeItem('ws_token');
    localStorage.removeItem('ws_user');
    set({ user: null, token: null });
  },

  hydrate: () => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('ws_token');
      const userStr = localStorage.getItem('ws_user');
      if (token && userStr) {
        try {
          const user = JSON.parse(userStr);
          set({ user, token });
        } catch {}
      }
    }
  },
}));
