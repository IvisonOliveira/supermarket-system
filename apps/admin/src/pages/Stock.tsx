import type { FormEvent } from 'react';
import { useState, useEffect, useCallback } from 'react';

import { Button, Modal, Input, Select, Badge, Table, Spinner } from '../components/ui';
import type { Column } from '../components/ui';
import { api } from '../services/api';

interface Product {
  id: string;
  name: string;
}

interface StockPosition {
  id: string;
  produto: string;
  estoqueAtual: number;
  estoqueMinimo: number;
}

interface Movement {
  id: string;
  data: string;
  produto: string;
  tipo: 'ENTRADA' | 'SAIDA' | 'AJUSTE' | 'VENDA';
  quantidade: number;
  responsavel: string;
  nota?: string;
}

export default function Stock() {
  const [activeTab, setActiveTab] = useState<'POSICAO' | 'MOVIMENTACAO'>('POSICAO');

  const [positions, setPositions] = useState<StockPosition[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);

  // Filtros Posição
  const [statusFilter, setStatusFilter] = useState('');

  // Filtros Movimentação
  const [movProductFilter, setMovProductFilter] = useState('');
  const [movTypeFilter, setMovTypeFilter] = useState('');
  const [movStartDate, setMovStartDate] = useState('');
  const [movEndDate, setMovEndDate] = useState('');

  // Modais
  const [isEntryModalOpen, setEntryModalOpen] = useState(false);
  const [isAdjModalOpen, setAdjModalOpen] = useState(false);

  // Forms
  const [entryForm, setEntryForm] = useState({ productId: '', quantity: '', nf: '', obs: '' });
  const [adjForm, setAdjForm] = useState({ productId: '', quantity: '', justification: '' });

  // Loaders
  const loadPositions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/stock/low');
      const dataPos = res.data?.items ?? res.data;
      setPositions(Array.isArray(dataPos) ? dataPos : []);
    } catch (err) {
      console.error('Erro ao listar estoque', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadMovements = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        produto: movProductFilter || undefined,
        tipo: movTypeFilter || undefined,
        start: movStartDate || undefined,
        end: movEndDate || undefined,
      };
      const res = await api.get('/stock/movements', { params });
      const dataMov = res.data?.items ?? res.data;
      setMovements(Array.isArray(dataMov) ? dataMov : []);
    } catch (err) {
      console.error('Erro ao listar movimentações', err);
    } finally {
      setLoading(false);
    }
  }, [movProductFilter, movTypeFilter, movStartDate, movEndDate]);

  const loadProducts = async () => {
    try {
      const res = await api.get('/products');
      const dataProd = res.data?.items ?? res.data;
      setProducts(Array.isArray(dataProd) ? dataProd : []);
    } catch (err) {
      console.error('Erro ao listar produtos', err);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  useEffect(() => {
    if (activeTab === 'POSICAO') loadPositions();
    else loadMovements();
  }, [activeTab, loadPositions, loadMovements]);

  // Submit Modals
  const submitEntry = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/stock/entry', entryForm);
      setEntryModalOpen(false);
      setEntryForm({ productId: '', quantity: '', nf: '', obs: '' });
      if (activeTab === 'POSICAO') loadPositions();
      else loadMovements();
    } catch (err) {
      alert('Erro ao registrar entrada.');
    }
  };

  const submitAdj = async (e: FormEvent) => {
    e.preventDefault();
    if (!adjForm.justification.trim()) {
      alert('Justificativa é obrigatória para ajustes.');
      return;
    }
    try {
      await api.post('/stock/adjustment', adjForm);
      setAdjModalOpen(false);
      setAdjForm({ productId: '', quantity: '', justification: '' });
      if (activeTab === 'POSICAO') loadPositions();
      else loadMovements();
    } catch (err) {
      alert('Erro ao registrar ajuste.');
    }
  };

  // Badges Status Position
  const getPositionStatusBadge = (atual: number, min: number) => {
    if (atual === 0) return <Badge variant="danger">Zerado</Badge>;
    if (atual <= min) return <Badge variant="warning">Baixo</Badge>;
    return <Badge variant="success">Normal</Badge>;
  };

  // Badges Status Type Movement
  const getMovementTypeBadge = (tipo: string) => {
    switch (tipo?.toUpperCase()) {
      case 'ENTRADA':
        return <Badge variant="info">Entrada</Badge>;
      case 'SAIDA':
        return <Badge variant="danger">Saída</Badge>;
      case 'AJUSTE':
        return <Badge variant="warning">Ajuste</Badge>;
      case 'VENDA':
        return <Badge variant="neutral">Venda</Badge>;
      default:
        return <Badge variant="neutral">{tipo}</Badge>;
    }
  };

  // Setup Options
  const prodOptions = [
    { value: '', label: 'Selecione um produto' },
    ...products.map((p) => ({ value: p.id, label: p.name })),
  ];

  // Filtro de Posições Local
  const filteredPositions = positions.filter((p) => {
    if (!statusFilter) return true;
    if (statusFilter === 'NORMAL') return p.estoqueAtual > p.estoqueMinimo;
    if (statusFilter === 'BAIXO') return p.estoqueAtual > 0 && p.estoqueAtual <= p.estoqueMinimo;
    if (statusFilter === 'ZERADO') return p.estoqueAtual === 0;
    return true;
  });

  const posColumns: Column<StockPosition>[] = [
    { key: 'produto', label: 'Produto' },
    { key: 'estoqueAtual', label: 'Estoque Atual' },
    { key: 'estoqueMinimo', label: 'Estoque Mínimo' },
    {
      key: 'status',
      label: 'Status',
      render: (item) => getPositionStatusBadge(item.estoqueAtual, item.estoqueMinimo),
    },
  ];

  const movColumns: Column<Movement>[] = [
    {
      key: 'data',
      label: 'Data',
      render: (item) => new Date(item.data).toLocaleString('pt-BR'),
    },
    { key: 'produto', label: 'Produto' },
    {
      key: 'tipo',
      label: 'Tipo',
      render: (item) => getMovementTypeBadge(item.tipo),
    },
    { key: 'quantidade', label: 'Quantidade' },
    { key: 'responsavel', label: 'Responsável' },
    { key: 'nota', label: 'Nota/Obs' },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[#1B2A5E]">Controle de Estoque</h1>
          <p className="text-slate-500 text-sm mt-0.5">Gerencie produtos e movimentações</p>
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={() => setEntryModalOpen(true)}>Entrada de Mercadoria</Button>
          <Button variant="secondary" onClick={() => setAdjModalOpen(true)}>
            Ajuste Manual
          </Button>
        </div>
      </div>

      <div className="border-b border-slate-200">
        <nav className="-mb-px flex space-x-6">
          <button
            onClick={() => setActiveTab('POSICAO')}
            className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm transition ${
              activeTab === 'POSICAO'
                ? 'border-[#C9A227] text-[#1B2A5E]'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            Posição Atual
          </button>
          <button
            onClick={() => setActiveTab('MOVIMENTACAO')}
            className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm transition ${
              activeTab === 'MOVIMENTACAO'
                ? 'border-[#C9A227] text-[#1B2A5E]'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            Movimentações
          </button>
        </nav>
      </div>

      {/* POSIÇÃO TAB */}
      {activeTab === 'POSICAO' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 flex flex-col gap-4">
          <div className="flex gap-4">
            <Select
              label="Filtrar por Status"
              options={[
                { value: '', label: 'Todos' },
                { value: 'NORMAL', label: 'Normal' },
                { value: 'BAIXO', label: 'Baixo' },
                { value: 'ZERADO', label: 'Zerado' },
              ]}
              value={statusFilter}
              onChange={(e: any) => setStatusFilter(e.target.value)}
            />
          </div>

          {loading ? (
            <div className="flex justify-center p-8">
              <Spinner />
            </div>
          ) : (
            <Table
              columns={posColumns}
              data={filteredPositions}
              emptyMessage="Nenhum produto encontrado no estoque."
            />
          )}
        </div>
      )}

      {/* MOVIMENTAÇÕES TAB */}
      {activeTab === 'MOVIMENTACAO' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 flex flex-col gap-4">
          <div className="flex flex-wrap items-end gap-4">
            <Select
              label="Produto"
              options={prodOptions}
              value={movProductFilter}
              onChange={(e: any) => setMovProductFilter(e.target.value)}
            />
            <Select
              label="Tipo de Movimentação"
              options={[
                { value: '', label: 'Todos' },
                { value: 'ENTRADA', label: 'Entrada' },
                { value: 'SAIDA', label: 'Saída' },
                { value: 'AJUSTE', label: 'Ajuste' },
                { value: 'VENDA', label: 'Venda' },
              ]}
              value={movTypeFilter}
              onChange={(e: any) => setMovTypeFilter(e.target.value)}
            />
            <Input
              label="Início"
              type="date"
              value={movStartDate}
              onChange={(e: any) => setMovStartDate(e.target.value)}
            />
            <Input
              label="Fim"
              type="date"
              value={movEndDate}
              onChange={(e: any) => setMovEndDate(e.target.value)}
            />
          </div>

          {loading ? (
            <div className="flex justify-center p-8">
              <Spinner />
            </div>
          ) : (
            <Table
              columns={movColumns}
              data={movements}
              emptyMessage="Nenhuma movimentação no período."
            />
          )}
        </div>
      )}

      {/* MODAL ENTRADA DE MERCADORIA */}
      <Modal
        isOpen={isEntryModalOpen}
        onClose={() => setEntryModalOpen(false)}
        title="Nova Entrada de Mercadoria"
      >
        <form onSubmit={submitEntry} className="space-y-4">
          <Select
            label="Produto"
            required
            options={prodOptions}
            value={entryForm.productId}
            onChange={(e: any) => setEntryForm({ ...entryForm, productId: e.target.value })}
          />
          <Input
            label="Quantidade"
            type="number"
            min="1"
            required
            value={entryForm.quantity}
            onChange={(e: any) => setEntryForm({ ...entryForm, quantity: e.target.value })}
          />
          <Input
            label="Número da NF de Compra (Opcional)"
            value={entryForm.nf}
            onChange={(e: any) => setEntryForm({ ...entryForm, nf: e.target.value })}
          />
          <Input
            label="Observação (Opcional)"
            value={entryForm.obs}
            onChange={(e: any) => setEntryForm({ ...entryForm, obs: e.target.value })}
          />
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="secondary" onClick={() => setEntryModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit">Registrar Entrada</Button>
          </div>
        </form>
      </Modal>

      {/* MODAL AJUSTE MANUAL */}
      <Modal
        isOpen={isAdjModalOpen}
        onClose={() => setAdjModalOpen(false)}
        title="Ajuste Manual de Estoque"
      >
        <form onSubmit={submitAdj} className="space-y-4">
          <Select
            label="Produto"
            required
            options={prodOptions}
            value={adjForm.productId}
            onChange={(e: any) => setAdjForm({ ...adjForm, productId: e.target.value })}
          />
          <Input
            label="Quantidade"
            type="number"
            required
            value={adjForm.quantity}
            onChange={(e: any) => setAdjForm({ ...adjForm, quantity: e.target.value })}
            placeholder="Ex: -10 para saída, 5 para entrada"
          />
          <Input
            label="Justificativa"
            required
            value={adjForm.justification}
            onChange={(e: any) => setAdjForm({ ...adjForm, justification: e.target.value })}
            placeholder="Obrigatório para auditoria"
          />
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="secondary" onClick={() => setAdjModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit">Registrar Ajuste</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
