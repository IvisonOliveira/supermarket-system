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
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  if (loading && !dailyReport) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <Spinner size="lg" />
        <p className="mt-4 text-slate-500 text-sm">Carregando dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <p className="text-lg font-semibold text-slate-700 mb-4">Dados indisponíveis</p>
        <button
          onClick={fetchData}
          className="px-4 py-2 bg-[#1B2A5E] text-white rounded-lg hover:bg-[#152248] transition text-sm"
        >
          Tentar novamente
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filtro de período */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <p className="text-sm font-semibold text-[#1B2A5E]">Resumo de Atividade</p>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="text-sm border border-slate-300 rounded-lg px-3 py-1.5 text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#1B2A5E]/30 focus:border-[#1B2A5E]"
          >
            <option value="HOJE">Hoje</option>
            <option value="SEMANA">Esta Semana</option>
            <option value="MES">Este Mês</option>
            <option value="PERSONALIZADO">Personalizado</option>
          </select>
          {period === 'PERSONALIZADO' && (
            <div className="flex items-center gap-2 flex-wrap">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="text-sm border border-slate-300 rounded-lg px-3 py-1.5 text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#1B2A5E]/30"
              />
              <span className="text-slate-400 text-sm">até</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="text-sm border border-slate-300 rounded-lg px-3 py-1.5 text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#1B2A5E]/30"
              />
            </div>
          )}
        </div>
      </div>

      {/* Cards de KPI */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <Card>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Vendas Hoje</p>
              {loading ? (
                <Spinner size="sm" className="mt-2" />
              ) : (
                <p className="text-2xl font-bold text-[#1B2A5E] mt-1">
                  {formatCurrency(dailyReport?.todaySales || 0)}
                </p>
              )}
            </div>
            <div className="w-10 h-10 rounded-xl bg-[#1B2A5E]/8 flex items-center justify-center">
              <svg className="w-5 h-5 text-[#1B2A5E]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Ticket Médio</p>
              {loading ? (
                <Spinner size="sm" className="mt-2" />
              ) : (
                <p className="text-2xl font-bold text-[#1B2A5E] mt-1">
                  {formatCurrency(dailyReport?.averageTicket || 0)}
                </p>
              )}
            </div>
            <div className="w-10 h-10 rounded-xl bg-[#C9A227]/10 flex items-center justify-center">
              <svg className="w-5 h-5 text-[#C9A227]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total de Vendas</p>
              {loading ? (
                <Spinner size="sm" className="mt-2" />
              ) : (
                <p className="text-2xl font-bold text-[#1B2A5E] mt-1">
                  {dailyReport?.totalOrders || 0}
                </p>
              )}
            </div>
            <div className="w-10 h-10 rounded-xl bg-[#1B2A5E]/8 flex items-center justify-center">
              <svg className="w-5 h-5 text-[#1B2A5E]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Estoque Baixo</p>
              {loading ? (
                <Spinner size="sm" className="mt-2" />
              ) : (
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-2xl font-bold text-[#1B2A5E]">{lowStockCount || 0}</p>
                  {(lowStockCount ?? 0) > 0 && (
                    <Badge variant="danger">{lowStockCount} itens</Badge>
                  )}
                </div>
              )}
            </div>
            <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center">
              <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
          </div>
        </Card>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Card title="Vendas — Últimos 30 dias">
          <div className="h-64 w-full mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={salesData} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis
                  stroke="#94a3b8"
                  fontSize={11}
                  tickLine={false}
                  tickFormatter={(v) => `R$${v}`}
                />
                <RechartsTooltip
                  formatter={(value: number) => [formatCurrency(value), 'Vendas']}
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="#C9A227"
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: '#1B2A5E', strokeWidth: 0 }}
                  activeDot={{ r: 5, fill: '#C9A227' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="Top 10 Produtos — Esta Semana">
          <div className="h-64 w-full mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={topProducts}
                layout="vertical"
                margin={{ top: 5, right: 10, bottom: 5, left: 40 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                <XAxis type="number" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis
                  dataKey="name"
                  type="category"
                  stroke="#94a3b8"
                  fontSize={11}
                  tickLine={false}
                  width={90}
                />
                <RechartsTooltip
                  formatter={(value: number) => [value, 'Quantidade']}
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                />
                <Bar dataKey="sales" fill="#1B2A5E" radius={[0, 4, 4, 0]} barSize={16} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </div>
  );
}
