import type React from 'react';
import { useState, useEffect, useMemo } from 'react';

import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { Select } from '../components/ui/Select';
import { Spinner } from '../components/ui/Spinner';
import { Table } from '../components/ui/Table';
import type { Column } from '../components/ui/Table';
import { api } from '../services/api';

interface FiscalNote {
  id: string | number;
  data: string; // ISO DateTime
  numero: string;
  valor: number;
  status: 'authorized' | 'cancelled' | 'pending' | 'rejected';
}

export default function Fiscal() {
  const [data, setData] = useState<FiscalNote[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [cancellingNfId, setCancellingNfId] = useState<string | number | null>(null);
  const [justificativa, setJustificativa] = useState('');
  const [isCancelling, setIsCancelling] = useState(false);

  const fetchFiscalData = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      if (statusFilter) params.append('status', statusFilter);

      const response = await api.get('/fiscal', { params });
      setData(response.data);
    } catch (error) {
      console.error('Erro ao buscar notas fiscais:', error);
      // Opcional: toast ou alert de erro genérico
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFiscalData();
  }, [startDate, endDate, statusFilter]);

  const handlePrint = (nf: FiscalNote) => {
    // Abre XML ou espelho da NF em nova aba.
    // Usando uma rota de exemplo, já que não especificado na prop
    window.open(`/api/fiscal/nfce/${nf.id}/xml`, '_blank');
  };

  const handleOpenCancelModal = (nfId: string | number) => {
    setCancellingNfId(nfId);
    setJustificativa('');
    setIsModalOpen(true);
  };

  const handleConfirmCancel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cancellingNfId || !justificativa.trim()) return;

    try {
      setIsCancelling(true);
      await api.delete(`/fiscal/nfce/${cancellingNfId}`, {
        data: { justificativa },
      });
      setIsModalOpen(false);
      setCancellingNfId(null);
      setJustificativa('');
      fetchFiscalData(); // Atualiza a tabela
    } catch (error) {
      console.error('Erro ao cancelar NF:', error);
      alert('Não foi possível cancelar a nota fiscal.');
    } finally {
      setIsCancelling(false);
    }
  };

  const renderStatus = (status: FiscalNote['status']) => {
    switch (status) {
      case 'authorized':
        return <Badge variant="success">Autorizada</Badge>;
      case 'cancelled':
        return <Badge variant="danger">Cancelada</Badge>;
      case 'pending':
        return <Badge variant="warning">Pendente</Badge>;
      case 'rejected':
        return <Badge variant="neutral">Rejeitada</Badge>;
      default:
        return <Badge variant="neutral">{status}</Badge>;
    }
  };

  const isNfNearCancelLimit = (dateString: string) => {
    const diffInMinutes = Math.floor(
      (new Date().getTime() - new Date(dateString).getTime()) / 60000,
    );
    return diffInMinutes >= 25 && diffInMinutes <= 30;
  };

  const canBeCancelled = (dateString: string) => {
    const diffInMinutes = Math.floor(
      (new Date().getTime() - new Date(dateString).getTime()) / 60000,
    );
    // Aparece para < 30 min para permitir cancelamento se está na faixa de > 25 (próximo de 30)
    // O texto original dizia "menos de 25 min", mas também pede alerta para "> 25 min (próximo a 30)".
    // Para resolver o conflito, manteremos visível até 30 min.
    return diffInMinutes < 30; // Ou se a regra literal "menos de 25" for absoluta: return diffInMinutes < 25;
  };

  const hasAlerts = useMemo(() => {
    return data.some((nf) => nf.status === 'authorized' && isNfNearCancelLimit(nf.data));
  }, [data]);

  const columns: Column<FiscalNote>[] = [
    {
      key: 'data',
      label: 'Data',
      render: (nf) => new Date(nf.data).toLocaleString(),
    },
    { key: 'numero', label: 'Número' },
    {
      key: 'valor',
      label: 'Valor (R$)',
      render: (nf) => `R$ ${Number(nf.valor).toFixed(2).replace('.', ',')}`,
    },
    {
      key: 'status',
      label: 'Status',
      render: (nf) => renderStatus(nf.status),
    },
    {
      key: 'actions',
      label: 'Ações',
      render: (nf) => (
        <div className="flex gap-2">
          <Button size="sm" variant="secondary" onClick={() => handlePrint(nf)}>
            Reimprimir
          </Button>
          {nf.status === 'authorized' && canBeCancelled(nf.data) && (
            <Button size="sm" variant="danger" onClick={() => handleOpenCancelModal(nf.id)}>
              Cancelar
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Notas Fiscais (NFC-e)</h1>
      </div>

      {hasAlerts && (
        <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-800 p-4 rounded shadow-sm dark:bg-yellow-900/40 dark:text-yellow-400">
          <div className="flex items-center">
            <svg className="w-6 h-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <p className="font-medium">
              Atenção: Existem notas autorizadas há mais de 25 minutos. O prazo máximo para
              cancelamento é de 30 minutos!
            </p>
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 flex flex-col md:flex-row gap-4 items-end">
        <Input
          type="date"
          label="Data Início"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
        />
        <Input
          type="date"
          label="Data Fim"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
        />
        <Select
          label="Status"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          options={[
            { value: '', label: 'Todos' },
            { value: 'authorized', label: 'Autorizada' },
            { value: 'cancelled', label: 'Cancelada' },
            { value: 'pending', label: 'Pendente' },
            { value: 'rejected', label: 'Rejeitada' },
          ]}
        />
        <div className="pb-1">
          <Button
            variant="secondary"
            onClick={() => {
              setStartDate('');
              setEndDate('');
              setStatusFilter('');
            }}
          >
            Limpar
          </Button>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm">
        {loading ? (
          <div className="flex justify-center p-8">
            <Spinner />
          </div>
        ) : (
          <Table columns={columns} data={data} emptyMessage="Nenhuma nota fiscal encontrada." />
        )}
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => !isCancelling && setIsModalOpen(false)}
        title="Cancelar Nota Fiscal"
      >
        <form onSubmit={handleConfirmCancel} className="space-y-4">
          <p className="text-gray-600 dark:text-gray-400 text-sm">
            Tem certeza que deseja cancelar esta nota fiscal? O prazo limite na Sefaz é de 30
            minutos.
          </p>
          <Input
            label="Justificativa (obrigatório)"
            placeholder="Mínimo 15 caracteres..."
            value={justificativa}
            onChange={(e) => setJustificativa(e.target.value)}
            required
            minLength={15}
          />
          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsModalOpen(false)}
              disabled={isCancelling}
            >
              Voltar
            </Button>
            <Button
              type="submit"
              variant="danger"
              loading={isCancelling}
              disabled={justificativa.length < 15}
            >
              Confirmar Cancelamento
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
