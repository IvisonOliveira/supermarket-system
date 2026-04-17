import { useEffect, useState, useCallback } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';

import { Badge } from '../components/ui/Badge';
import { Card } from '../components/ui/Card';
import { Spinner } from '../components/ui/Spinner';
import { api } from '../services/api';
import { useAuthStore, useUIStore } from '../store/useAppStore';

interface DailyReport {
  todaySales: number;
  averageTicket: number;
  totalOrders: number;
}

interface SalesData {
  date: string;
  value: number;
}

interface TopProduct {
  name: string;
  sales: number;
}

export default function Dashboard() {
  const { isMenuOpen, toggleMenu } = useUIStore();
  const { user, logout } = useAuthStore();

  const [period, setPeriod] = useState('HOJE');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const [dailyReport, setDailyReport] = useState<DailyReport | null>(null);
  const [salesData, setSalesData] = useState<SalesData[]>([]);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [lowStockCount, setLowStockCount] = useState<number | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const [resDaily, resSales, resTop, resStock] = await Promise.all([
        api.get('/reports/daily'),
        api.get('/reports/sales'),
        api.get('/reports/top-products'),
        api.get('/stock/low'),
      ]);

      setDailyReport({
        todaySales: resDaily.data?.todaySales ?? resDaily.data?.total ?? 0,
        averageTicket: resDaily.data?.averageTicket ?? resDaily.data?.ticket ?? 0,
        totalOrders: resDaily.data?.totalOrders ?? resDaily.data?.count ?? 0,
      });

      const salesItems = resSales.data?.items ?? resSales.data;
      setSalesData(Array.isArray(salesItems) ? salesItems : []);

      const topItems = resTop.data?.items ?? resTop.data;
      setTopProducts(Array.isArray(topItems) ? topItems : []);

      const stockData = resStock.data?.items ?? resStock.data ?? [];
      setLowStockCount(Array.isArray(stockData) ? stockData.length : stockData?.count || 0);
    } catch (err) {
      console.error(err);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60000); // Polling a cada 60s
    return () => clearInterval(interval);
  }, [fetchData]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const renderContent = () => {
    if (loading && !dailyReport) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[400px]">
          <Spinner size="lg" />
          <p className="mt-4 text-gray-500">Carregando dados do dashboard...</p>
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[400px] bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700">
          <p className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-4">
            Dados indisponíveis
          </p>
          <button
            onClick={fetchData}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition"
          >
            Tentar novamente
          </button>
        </div>
      );
    }

    return (
      <>
        {/* Topo: seletor de período */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4 bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
              Resumo de Atividade
            </h2>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-primary-500 focus:border-primary-500 p-2 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white"
            >
              <option value="HOJE">Hoje</option>
              <option value="SEMANA">Esta Semana</option>
              <option value="MES">Este Mês</option>
              <option value="PERSONALIZADO">Personalizado</option>
            </select>

            {period === 'PERSONALIZADO' && (
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg p-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
                <span className="text-gray-500">até</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg p-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>
            )}
          </div>
        </div>

        {/* 4 cards de resumo em grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          <Card className="flex flex-col justify-center">
            <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
              Vendas Hoje
            </h4>
            <div className="flex items-center gap-2">
              {loading ? (
                <Spinner size="sm" />
              ) : (
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {formatCurrency(dailyReport?.todaySales || 0)}
                </p>
              )}
            </div>
          </Card>

          <Card className="flex flex-col justify-center">
            <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
              Ticket Médio
            </h4>
            <div className="flex items-center gap-2">
              {loading ? (
                <Spinner size="sm" />
              ) : (
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {formatCurrency(dailyReport?.averageTicket || 0)}
                </p>
              )}
            </div>
          </Card>

          <Card className="flex flex-col justify-center">
            <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
              Total de Vendas
            </h4>
            <div className="flex items-center gap-2">
              {loading ? (
                <Spinner size="sm" />
              ) : (
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {dailyReport?.totalOrders || 0}
                </p>
              )}
            </div>
          </Card>

          <Card className="flex flex-col justify-center">
            <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
              Estoque Baixo
            </h4>
            <div className="flex items-center gap-2 pt-1">
              {loading ? (
                <Spinner size="sm" />
              ) : (
                <div className="flex items-center gap-3">
                  <p className="text-2xl font-bold text-gray-900 dark:text-white leading-none">
                    {lowStockCount || 0}
                  </p>
                  {lowStockCount !== null && lowStockCount > 0 && (
                    <Badge variant="danger">{lowStockCount} produtos</Badge>
                  )}
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Gráficos */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-6">
          <Card title="Vendas Histórico (30 dias)" className="min-h-[350px]">
            {loading && salesData.length === 0 ? (
              <div className="flex items-center justify-center h-[280px]">
                <Spinner />
              </div>
            ) : (
              <div className="h-[280px] w-full mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={salesData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                    <XAxis dataKey="date" stroke="#6b7280" fontSize={12} tickLine={false} />
                    <YAxis
                      stroke="#6b7280"
                      fontSize={12}
                      tickLine={false}
                      tickFormatter={(value) => `R$ ${value}`}
                    />
                    <RechartsTooltip
                      formatter={(value: any) => [formatCurrency(value), 'Vendas']}
                      contentStyle={{
                        borderRadius: '8px',
                        border: 'none',
                        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke="#0ea5e9"
                      strokeWidth={3}
                      dot={{ r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </Card>

          <Card title="Top 10 Produtos (Semana)" className="min-h-[350px]">
            {loading && topProducts.length === 0 ? (
              <div className="flex items-center justify-center h-[280px]">
                <Spinner />
              </div>
            ) : (
              <div className="h-[280px] w-full mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={topProducts}
                    layout="vertical"
                    margin={{ top: 5, right: 20, bottom: 5, left: 40 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
                    <XAxis type="number" stroke="#6b7280" fontSize={12} />
                    <YAxis
                      dataKey="name"
                      type="category"
                      stroke="#6b7280"
                      fontSize={12}
                      tickLine={false}
                      width={100}
                    />
                    <RechartsTooltip
                      formatter={(value: any) => [value, 'Quantidade']}
                      contentStyle={{
                        borderRadius: '8px',
                        border: 'none',
                        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                      }}
                    />
                    <Bar dataKey="sales" fill="#10b981" radius={[0, 4, 4, 0]} barSize={20} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </Card>
        </div>
      </>
    );
  };

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
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
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                />
              </svg>
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
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
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

        <section className="p-8 flex-1 overflow-y-auto">{renderContent()}</section>
      </main>
    </div>
  );
}
