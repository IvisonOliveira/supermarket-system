import axios from 'axios';

/**
 * Instância global do Axios para acesso à API do backend.
 * Pode ser configurada com interceptors para tokens de autenticação.
 */
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para adicionar Token JWT no cabeçalho e lidar com expiração/401
api.interceptors.request.use(
  (config) => {
    // Busca os dados da store persistidos no localStorage
    // Como a chave default do persist middleware no Zustand será 'auth-storage'
    const storageData = localStorage.getItem('auth-storage');
    if (storageData) {
      try {
        const parsed = JSON.parse(storageData);
        const token = parsed?.state?.token;
        if (token && config.headers) config.headers.Authorization = `Bearer ${token}`;
      } catch (err) {
        // failed to parse
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Limpa dados críticos e redireciona (hard redirect limpa todos os estados em memória)
      localStorage.removeItem('auth-storage');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
