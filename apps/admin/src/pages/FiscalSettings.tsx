import type React from 'react';
import { useState, useEffect, useRef } from 'react';

import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Spinner } from '../components/ui/Spinner';
import { api } from '../services/api';
import { useAuthStore } from '../store/useAppStore';

interface CertificateData {
  cnpj: string;
  razaoSocial: string;
  validade: string;
  ie: string;
  regime: string;
}

export default function FiscalSettings() {
  const user = useAuthStore((state) => state.user);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<CertificateData | null>(null);

  // Upload state
  const [showUpload, setShowUpload] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [password, setPassword] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await api.get('/fiscal/certificate/status');
      setData(res.data);
    } catch (err) {
      console.error('Erro ao buscar dados fiscais', err);
      // Fallback pra não bugar a tela se não tiver backend pronto ainda
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (user?.role !== 'ADMIN') {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded dark:bg-red-900/20 dark:border-red-800/30 dark:text-red-400">
          Acesso Restrito: Apenas administradores podem acessar as configurações fiscais.
        </div>
      </div>
    );
  }

  const isExpiringSoon = data?.validade
    ? (new Date(data.validade).getTime() - Date.now()) / (1000 * 60 * 60 * 24) < 30
    : false;

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const dropped = e.dataTransfer.files[0];
      if (dropped.name.endsWith('.pfx')) {
        setFile(dropped);
      } else {
        alert('Apenas arquivos .pfx são aceitos.');
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selected = e.target.files[0];
      if (selected.name.endsWith('.pfx')) {
        setFile(selected);
      } else {
        alert('Apenas arquivos .pfx são aceitos.');
      }
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !password) return;
    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append('certificate', file);
      formData.append('password', password);

      await api.post('/fiscal/certificate', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      alert('Certificado atualizado com sucesso!');
      setShowUpload(false);
      setFile(null);
      setPassword('');
      fetchData();
    } catch (err) {
      console.error(err);
      alert('Erro ao atualizar certificado. Verifique a senha e o arquivo.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Configurações Fiscais</h1>
      </div>

      {loading ? (
        <div className="flex justify-center p-12">
          <Spinner />
        </div>
      ) : (
        <>
          <Card
            title="Status do Certificado Digital"
            className={isExpiringSoon ? 'border-red-500 dark:border-red-500' : ''}
          >
            {isExpiringSoon && (
              <div className="mb-4 text-red-600 bg-red-50 p-3 rounded border border-red-100 dark:bg-red-900/20 dark:border-red-800/30 dark:text-red-400 font-medium text-sm">
                Atenção: Seu certificado expira em menos de 30 dias. Por favor, atualize-o para
                evitar bloqueios na emissão.
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input label="Razão Social" value={data?.razaoSocial || 'Não cadastrado'} disabled />
              <Input label="CNPJ" value={data?.cnpj || 'Não cadastrado'} disabled />
              <Input
                label="Data de Validade"
                value={
                  data?.validade ? new Date(data.validade).toLocaleDateString() : 'Desconhecida'
                }
                disabled
              />
            </div>
            <div className="mt-6 flex justify-end">
              <Button onClick={() => setShowUpload(!showUpload)}>
                {showUpload ? 'Cancelar Atualização' : 'Atualizar Certificado'}
              </Button>
            </div>
          </Card>

          {showUpload && (
            <Card title="Upload de Novo Certificado">
              <form onSubmit={handleUpload} className="space-y-4">
                {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
                <div
                  className={`border-2 border-dashed rounded-lg p-8 flex flex-col items-center justify-center text-center transition-colors cursor-pointer ${
                    dragActive
                      ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/10'
                      : 'border-gray-300 dark:border-gray-600 hover:border-primary-400 dark:hover:border-primary-500'
                  }`}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept=".pfx"
                    className="hidden"
                  />
                  <div className="w-12 h-12 mb-3 text-gray-400 dark:text-gray-500">
                    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                      />
                    </svg>
                  </div>
                  {file ? (
                    <p className="text-sm font-medium text-primary-600 dark:text-primary-400">
                      {file.name}
                    </p>
                  ) : (
                    <>
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Clique ou arraste o certificado aqui
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Apenas arquivos .pfx suportados
                      </p>
                    </>
                  )}
                </div>

                <div className="max-w-xs">
                  <Input
                    type="password"
                    label="Senha do Certificado"
                    value={password}
                    onChange={(e: any) => setPassword(e.target.value)}
                    required
                    placeholder="Sua senha..."
                  />
                </div>

                <div className="flex justify-end pt-2">
                  <Button type="submit" loading={isUploading} disabled={!file || !password}>
                    Confirmar Envio
                  </Button>
                </div>
              </form>
            </Card>
          )}

          <Card title="Dados da Empresa">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input label="CNPJ Emissor" value={data?.cnpj || ''} disabled />
              <Input label="Inscrição Estadual" value={data?.ie || ''} disabled />
              <Select
                label="Regime Tributário"
                value={data?.regime || ''}
                onChange={() => {}} // Apenas exibição
                disabled
                options={[
                  { value: '', label: 'Não informado' },
                  { value: 'simples', label: 'Simples Nacional' },
                  { value: 'presumido', label: 'Lucro Presumido' },
                  { value: 'real', label: 'Lucro Real' },
                ]}
              />
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-4">
              * A edição dos dados da empresa será liberada em uma fase futura do sistema.
            </p>
          </Card>
        </>
      )}
    </div>
  );
}
