import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (user: User, token: string) => void;
  logout: () => void;
}

interface UIState {
  isMenuOpen: boolean;
  toggleMenu: () => void;
}

/**
 * Store global de Autenticação com persistência no localStorage.
 */
export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      login: (user, token) => set({ user, token, isAuthenticated: true }),
      logout: () => set({ user: null, token: null, isAuthenticated: false }),
    }),
    {
      name: 'auth-storage', // nome da chave no localStorage
    }
  )
);

/**
 * Store global de UI, isolado de Autenticação. Sem persistência pois é volátil.
 */
export const useUIStore = create<UIState>((set) => ({
  isMenuOpen: true,
  toggleMenu: () => set((state) => ({ isMenuOpen: !state.isMenuOpen })),
}));
