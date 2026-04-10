import { useEffect, useState } from 'react';
import { useAuthStore, useUIStore } from '../store/useAppStore';
import { api } from '../services/api';

export default function Dashboard() {
  const { isMenuOpen, toggleMenu } = useUIStore();
  const { user, logout } = useAuthStore();
  const [data, setData] = useState<string>('Carregando...');

  useEffect(() => {
    // Exemplo de chamada HTTP usando a configuração local do Axios
    const fetchData = async () => {
      try {
        const response = await api.get('/health');
        setData(`Dados da API: ${response.data?.status || 'OK'}`);
      } catch (error) {
        setData('Backend não conectado — aguardando configuração');
        console.error(error);
      }
    };
    
    fetchData();
  }, []);

  return (
    <div className="flex h-screen bg-gray-100 dark:bg-gray-900 transition-colors duration-300">
      {/* Sidebar simulada */}
      {isMenuOpen && (
        <aside className="w-64 bg-primary-600 text-white flex flex-col p-6 shadow-xl">
          <h2 className="text-2xl font-bold tracking-tight mb-8">SisAdmin</h2>
          <nav className="flex-1 space-y-2">
            <button className="w-full text-left py-2 px-3 bg-primary-700 rounded-lg hover:bg-primary-500 transition shadow">
              Dashboard Principal
            </button>
            <button className="w-full text-left py-2 px-3 hover:bg-primary-500 rounded-lg transition text-primary-50">
              Usuários
            </button>
            <button className="w-full text-left py-2 px-3 hover:bg-primary-500 rounded-lg transition text-primary-50">
              Configurações
            </button>
          </nav>
          
          <div className="mt-auto pt-6 border-t border-primary-500">
            <button 
              onClick={logout}
              className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-red-500/20 text-red-100 hover:bg-red-500 hover:text-white rounded-lg transition"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
              Sair
            </button>
          </div>
        </aside>
      )}

      {/* Área Principal */}
      <main className="flex-1 flex flex-col h-full overflow-hidden">
        <header className="bg-white dark:bg-gray-800 shadow-sm border-b dark:border-gray-700 p-4 flex justify-between items-center z-10 transition-colors duration-300">
          <div className="flex items-center gap-4">
            <button
              onClick={toggleMenu}
              className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition"
              aria-label="Alternar Menu"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <h1 className="text-xl font-semibold text-gray-800 dark:text-gray-100">Visão Geral</h1>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{user?.name}</p>
              <p className="text-xs text-gray-500 capitalize">{user?.role}</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 font-bold border-2 border-primary-500">
              {user?.name?.charAt(0) || 'U'}
            </div>
          </div>
        </header>

        <section className="p-8 flex-1 overflow-y-auto">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 p-8 flex flex-col items-center justify-center min-h-[400px] text-center mb-6">
            <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 text-green-500 rounded-full flex items-center justify-center mb-6 shadow-inner">
              <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">Painel do Administrador</h3>
            <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto">
              Você está autenticado de forma persistente através do Zustand Persist Middleware. E as requisições (interceptors) estão acopladas à lógica de Token do Axios.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow border border-gray-100 dark:border-gray-700">
              <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Status da API (Axios)</h4>
              <p className="text-gray-900 dark:text-white font-semibold truncate">{data}</p>
            </div>
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow border border-gray-100 dark:border-gray-700">
              <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Estado Atual (Zustand)</h4>
              <p className="text-gray-900 dark:text-white font-semibold capitalize">{isMenuOpen ? 'Menu Aberto' : 'Menu Fechado'}</p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
