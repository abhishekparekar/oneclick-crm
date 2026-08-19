import { create } from 'zustand';

interface AuthState {
  token: string | null;
  user: any | null;
  org: any | null;
  isAuthenticated: boolean;
  login: (token: string, user: any, org?: any) => void;
  logout: () => void;
  setOrg: (org: any) => void;
  initialize: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  user: null,
  org: null,
  isAuthenticated: false,
  login: (token, user, org = null) => {
    localStorage.setItem('leadflow_token', token);
    localStorage.setItem('leadflow_user', JSON.stringify(user));
    if (org) {
      localStorage.setItem('leadflow_org', JSON.stringify(org));
    }
    set({ token, user, org, isAuthenticated: true });
  },
  logout: () => {
    localStorage.removeItem('leadflow_token');
    localStorage.removeItem('leadflow_user');
    localStorage.removeItem('leadflow_org');
    set({ token: null, user: null, org: null, isAuthenticated: false });
  },
  setOrg: (org) => {
    if (org) {
      localStorage.setItem('leadflow_org', JSON.stringify(org));
    } else {
      localStorage.removeItem('leadflow_org');
    }
    set({ org });
  },
  initialize: () => {
    const token = localStorage.getItem('leadflow_token');
    const userStr = localStorage.getItem('leadflow_user');
    const orgStr = localStorage.getItem('leadflow_org');
    if (token && userStr) {
      try {
        const user = JSON.parse(userStr);
        const org = orgStr ? JSON.parse(orgStr) : null;
        set({ token, user, org, isAuthenticated: true });
      } catch (e) {
        localStorage.removeItem('leadflow_token');
        localStorage.removeItem('leadflow_user');
        localStorage.removeItem('leadflow_org');
      }
    }
  },
}));
