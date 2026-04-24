import { ipcMain } from 'electron';
import { IPC } from '../shared/ipc-channels';

const API_URL = process.env.VITE_API_URL || 'http://localhost:3000/api/v1';

let authToken: string | null = null;
let authUser: any | null = null;

export function getAuthToken(): string | null {
  return authToken;
}

export function initAuthHandlers() {
  ipcMain.handle(IPC.AUTH_LOGIN, async (_event, email: string, password: string) => {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Credenciais inválidas');
    }
    const data = await res.json();
    authToken = data.token;
    authUser = data.user;
    return { token: authToken, user: authUser };
  });

  ipcMain.handle(IPC.AUTH_LOGOUT, async () => {
    authToken = null;
    authUser = null;
  });

  ipcMain.handle(IPC.AUTH_GET_TOKEN, async () => authToken);
  ipcMain.handle(IPC.AUTH_GET_USER, async () => authUser);
}
