import { useState, useEffect } from 'react';
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

import { api } from '../services/api';
import { Button, Card, Spinner, Badge, Table } from '../components/ui';
import type { Column } from '../components/ui';

interface ABCData {
  produto: string;
  vendas: number;
  percentualReceita: number;
  percentualAcumulado: number;
  classe: 'A' | 'B' | 'C';
}

export default function ReportABC() {
  const [data, setData] = useState<ABCData[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Define startDate and endDate initial state
  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
  const [startDate, setStartDate] = useState(firstDay.toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(today.toISOString().split('T')[0]);

  const fetchABCData = async () => {
    setLoading(true);
    try {
      const response = await api.get('/reports/abc', {
        params: { start: startDate, end: endDate },
      });
      // Accept various response formats safely
      const items = response.data?.items ?? response.data;
      setData(Array.isArray(items) ? items : []);
    } catch (error) {
      console.error('Erro ao buscar dados da curva ABC:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchABCData();
  }, [startDate, endDate]);

  const handleExportCSV = () => {
    if (data.length === 0) return;

    // Cabeçalhos (Headers)
    const headers = ['Produto', 'Vendas (R$)', '% da Receita', '% Acumulada', 'Classe'];
    const csvRows = [headers.join(',')];

    // Dados (Data rows)
    for (const item of data) {
      const row = [
        `"${item.produto}"`, // envolver em aspas caso tenha vírgulas
        item.vendas.toFixed(2),
        item.percentualReceita.toFixed(2),
        item.percentualAcumulado.toFixed(2),
        item.classe,
      ];
      csvRows.push(row.join(','));
    }

    // Criar arquivo (Blob) e baixar
    const csvString = csvRows.join('\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `curva_abc_${startDate}_a_${endDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  const renderBadgeClasse = (classe: string) => {
    switch (classe?.toUpperCase()) {
      case 'A':
        return <Badge variant="success">A</Badge>;
      case 'B':
        return <Badge variant="warning">B</Badge>;
      case 'C':
        return <Badge variant="danger">C</Badge>;
      default:
        return <Badge variant="neutral">{classe}</Badge>;
    }
  };

  const columns: Column<ABCData>[] = [
    { key: 'produto', label: 'Produto' },
    { 
      key: 'vendas', 
      label: 'Vendas (R$)',
      render: (item) => formatCurrency(item.vendas)
    },
    { 
      key: 'percentualReceita', 
      label: '% da Receita',
      render: (item) => `${item.percentualReceita?.toFixed(2) || 0}%`
    },
    { 
      key: 'percentualAcumulado', 
      label: '% Acumulada',
      render: (item) => `${item.percentualAcumulado?.toFixed(2) || 0}%`
    },
    { 
      key: 'classe', 
      label: 'Classe',
      render: (item) => renderBadgeClasse(item.classe)
    },
  ];

  return (
    <div className="p-6 h-full flex flex-col gap-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-gray-800 p-6 rounded-xl shadow border border-gray-100 dark:border-gray-700">
        <div>
          <h1 className="text-2xl font-bold dark:text-white">Curva ABC de Vendas</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Análise de Pareto por classificação</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
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
          <Button onClick={fetchABCData}>Filtrar</Button>
          <Button variant="secondary" onClick={handleExportCSV} disabled={data.length === 0}>
            Exportar CSV
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center p-12 bg-white dark:bg-gray-800 rounded-xl shadow border border-gray-100 dark:border-gray-700 min-h-[400px]">
          <Spinner size="lg" />
          <p className="mt-4 text-gray-500">Buscando dados do relatório...</p>
        </div>
      ) : (
        <>
          {data.length > 0 ? (
            <>
              <Card title="Gráfico de Pareto (Curva ABC)">
                <div className="h-[400px] w-full mt-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={data} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                      <CartesianGrid stroke="#e5e7eb" strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="produto" scale="band" stroke="#6b7280" fontSize={12} tickLine={false} />
                      <YAxis yAxisId="left" stroke="#6b7280" fontSize={12} tickLine={false} tickFormatter={(value) => `R$ ${value}`} />
                      <YAxis yAxisId="right" orientation="right" stroke="#6b7280" fontSize={12} tickLine={false} tickFormatter={(value) => `${value}%`} />
                      <Tooltip 
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        formatter={(value: number, name: string) => {
                          if (name === 'Vendas') return [formatCurrency(value), name];
                          if (name === '% Acumulada') return [`${value.toFixed(2)}%`, name];
                          return [value, name];
                        }}
                      />
                      <Legend />
                      <Bar yAxisId="left" dataKey="vendas" name="Vendas" fill="#0ea5e9" radius={[4, 4, 0, 0]} barSize={40} />
                      <Line yAxisId="right" type="monotone" dataKey="percentualAcumulado" name="% Acumulada" stroke="#f59e0b" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              <div className="bg-white dark:bg-gray-800 rounded-xl shadow border border-gray-100 dark:border-gray-700 overflow-hidden">
                <Table columns={columns} data={data} emptyMessage="Nenhum dado encontrado para o período." />
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center p-12 bg-white dark:bg-gray-800 rounded-xl shadow border border-gray-100 dark:border-gray-700 min-h-[400px]">
              <p className="text-lg text-gray-500 dark:text-gray-400">Nenhum dado encontrado para o período selecionado.</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
