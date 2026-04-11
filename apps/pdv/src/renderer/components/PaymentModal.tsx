import { useState, useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { SaleItem } from '../pages/PDV';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  items: SaleItem[];
  total: number;
  discount: number;
}

type PaymentMethod = 'dinheiro' | 'pix' | 'cartao_credito' | 'cartao_debito';
type Tab = 'dinheiro' | 'pix' | 'cartao';

export default function PaymentModal({
  isOpen,
  onClose,
  onSuccess,
  items,
  total,
  discount,
}: PaymentModalProps) {
  const [activeTab, setActiveTab] = useState<Tab>('dinheiro');
  const [receivedAmount, setReceivedAmount] = useState<number>(0);
  const receivedInputRef = useRef<HTMLInputElement>(null);

  const [fiscalState, setFiscalState] = useState<'idle' | 'emitting' | 'success' | 'failed'>(
    'idle',
  );
  const [accessKey, setAccessKey] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [currentSaleId, setCurrentSaleId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setActiveTab('dinheiro');
      setReceivedAmount(0);
      setFiscalState('idle');
      setCurrentSaleId(null);
      setTimeout(() => receivedInputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || fiscalState !== 'idle') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }

      const activeElement = document.activeElement;
      const isInputFocused = activeElement?.tagName === 'INPUT';

      if (!isInputFocused) {
        if (e.key === '1') {
          e.preventDefault();
          setActiveTab('dinheiro');
          setTimeout(() => receivedInputRef.current?.focus(), 100);
        }
        if (e.key === '2') {
          e.preventDefault();
          setActiveTab('pix');
        }
        if (e.key === '3') {
          e.preventDefault();
          setActiveTab('cartao');
        }
      }

      if (e.key === 'Enter') {
        e.preventDefault();
        const changeValue = Math.max(0, receivedAmount - total);
        const isValid = receivedAmount >= total;

        if (activeTab === 'dinheiro' && isValid) handleConfirm('dinheiro');
        if (activeTab === 'pix') handleConfirm('pix');
        if (activeTab === 'cartao') handleConfirm('cartao_credito');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, activeTab, receivedAmount, total]);

  if (!isOpen) return null;

  const change = Math.max(0, receivedAmount - total);
  const isDinheiroValid = receivedAmount >= total;

  const handleConfirm = async (method: PaymentMethod, retrySaleId?: string) => {
    try {
      setFiscalState('emitting');
      const isOnline = navigator.onLine;
      const saleId = retrySaleId || uuidv4();

      if (!retrySaleId) {
        setCurrentSaleId(saleId);
        const saleData = {
          id: saleId,
          cashier_id: '00000000-0000-0000-0000-000000000000', // Mock
          operator_id: 'OFFLINE_OPERATOR', // Mock
          items: items.map((i) => ({
            product_id: i.id,
            quantity: i.quantity,
            unit_price: i.price,
          })),
          total,
          discount,
          change: method === 'dinheiro' ? change : 0,
          payment_method: method,
          fiscal_status: isOnline ? 'pending' : 'pending',
          created_at: new Date().toISOString(),
        };

        if (window.electronAPI?.db?.createSale) {
          await window.electronAPI.db.createSale(saleData);
        }

        if (!isOnline) {
          alert('Modo offline: Venda salva, emissão será feita quando sincronizar.');
          onSuccess();
          return;
        }
      }

      // Online
      const response = await fetch(`http://localhost:3000/api/fiscal/nfce/${saleId}`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Falha na comunicação ao tentar emitir NF');
      }

      const resData = await response.json();
      setAccessKey(resData.chave || '00000000000000000000000000000000000000000000');
      setFiscalState('success');
    } catch (error: any) {
      console.error('Erro na emissão fiscal:', error);
      setErrorMsg(error.message || 'Erro desconhecido');
      setFiscalState('failed');
    }
  };

  const handleSkipFiscal = () => {
    onSuccess();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-gray-900 border border-gray-700 w-full max-w-4xl rounded-2xl shadow-2xl flex flex-col md:flex-row overflow-hidden text-white font-sans">
        {fiscalState === 'idle' ? (
          <>
            {/* Lado Esquerdo - Totais e Botões Metódos */}
            <div className="w-full md:w-1/3 bg-gray-800 p-8 border-r border-gray-700 flex flex-col">
              <h2 className="text-2xl text-gray-400 font-bold tracking-widest mb-2">
                TOTAL DA VENDA
              </h2>
              <div className="text-6xl font-black text-green-400 mb-8 tracking-tighter">
                R$ {total.toFixed(2)}
              </div>

              <div className="space-y-4 mt-auto">
                <button
                  onClick={() => {
                    setActiveTab('dinheiro');
                    setTimeout(() => receivedInputRef.current?.focus(), 10);
                  }}
                  className={`w-full py-4 px-6 text-xl font-bold rounded-lg transition-all ${activeTab === 'dinheiro' ? 'bg-blue-600 text-white shadow-lg' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
                >
                  Dinheiro
                </button>
                <button
                  onClick={() => setActiveTab('pix')}
                  className={`w-full py-4 px-6 text-xl font-bold rounded-lg transition-all ${activeTab === 'pix' ? 'bg-blue-600 text-white shadow-lg' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
                >
                  PIX
                </button>
                <button
                  onClick={() => setActiveTab('cartao')}
                  className={`w-full py-4 px-6 text-xl font-bold rounded-lg transition-all ${activeTab === 'cartao' ? 'bg-blue-600 text-white shadow-lg' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
                >
                  Cartão
                </button>
              </div>
            </div>

            {/* Lado Direito - Conteúdo da Aba */}
            <div className="w-full md:w-2/3 p-8 flex flex-col items-center justify-center bg-gray-900 border-t md:border-t-0 md:border-l border-black/50">
              {activeTab === 'dinheiro' && (
                <div className="w-full max-w-md flex flex-col items-center space-y-8">
                  <div className="w-full">
                    <label className="text-2xl text-gray-400 font-bold block mb-4 text-center">
                      Valor Recebido
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-4xl text-gray-500 font-black">
                        R$
                      </span>
                      <input
                        ref={receivedInputRef}
                        type="number"
                        min="0"
                        step="0.01"
                        className="w-full bg-gray-800 border-2 border-gray-600 rounded-xl text-5xl font-black py-6 pl-20 pr-6 outline-none focus:border-blue-500 transition-colors shadow-inner text-center"
                        value={receivedAmount || ''}
                        onChange={(e) => setReceivedAmount(Number(e.target.value) || 0)}
                      />
                    </div>
                  </div>

                  <div className="w-full bg-gray-800 p-6 rounded-xl border border-gray-700 text-center shadow-inner">
                    <span className="text-xl text-gray-400 font-medium block mb-2">Troco</span>
                    <span
                      className={`text-6xl font-black block ${change > 0 ? 'text-orange-400' : 'text-gray-500'}`}
                    >
                      R$ {change.toFixed(2)}
                    </span>
                  </div>

                  <button
                    disabled={!isDinheiroValid}
                    onClick={() => handleConfirm('dinheiro')}
                    className="w-full bg-green-600 hover:bg-green-500 disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed text-white text-3xl font-black py-6 rounded-xl transition-colors shadow-lg active:scale-95"
                  >
                    CONFIRMAR
                  </button>
                </div>
              )}

              {activeTab === 'pix' && (
                <div className="w-full max-w-md flex flex-col items-center space-y-10">
                  <div className="w-64 h-64 bg-gray-800 border-4 border-dashed border-gray-600 rounded-2xl flex items-center justify-center p-4">
                    <p className="text-center text-gray-400 text-xl font-medium">
                      QR Code será exibido aqui
                    </p>
                  </div>

                  <button
                    onClick={() => handleConfirm('pix')}
                    className="w-full bg-teal-500 hover:bg-teal-400 text-white text-3xl font-black py-6 rounded-xl transition-colors shadow-lg active:scale-95 flex items-center justify-center gap-3"
                  >
                    <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                    </svg>
                    CONFIRMAR PIX RECEBIDO
                  </button>
                </div>
              )}

              {activeTab === 'cartao' && (
                <div className="w-full max-w-md flex flex-col items-center space-y-10">
                  <div className="w-full py-16 bg-gray-800 border border-gray-700 rounded-2xl flex flex-col items-center justify-center shadow-inner">
                    <svg
                      className="w-20 h-20 text-gray-600 mb-6"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                      />
                    </svg>
                    <p className="text-center text-gray-400 text-xl font-medium px-4">
                      Aguardando integração TEF
                    </p>
                  </div>

                  <button
                    onClick={() => handleConfirm('cartao_credito')}
                    className="w-full bg-purple-600 hover:bg-purple-500 text-white text-2xl font-black py-6 rounded-xl transition-colors shadow-lg active:scale-95"
                  >
                    SIMULAR APROVAÇÃO
                  </button>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="w-full p-12 flex flex-col items-center justify-center text-center">
            {fiscalState === 'emitting' && (
              <div className="flex flex-col items-center">
                <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-6"></div>
                <h2 className="text-3xl font-bold text-white">Emitindo NFC-e...</h2>
                <p className="text-gray-400 mt-4">Aguardando autorização da Sefaz</p>
              </div>
            )}

            {fiscalState === 'success' && (
              <div className="flex flex-col items-center w-full max-w-2xl">
                <svg
                  className="w-20 h-20 text-green-500 mb-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <h2 className="text-3xl font-bold text-green-400 mb-2">
                  NF Autorizada com Sucesso!
                </h2>
                <div className="bg-gray-800 p-4 rounded-lg border border-gray-700 w-full my-6 text-center">
                  <p className="text-sm text-gray-400 mb-1">Chave de Acesso:</p>
                  <p className="font-mono text-lg break-all text-white">{accessKey}</p>
                </div>
                <div className="flex gap-4 w-full">
                  <button
                    onClick={onSuccess}
                    className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-bold py-4 rounded-xl"
                  >
                    Fechar
                  </button>
                  <button
                    onClick={() => alert('Simulando impressão...')}
                    className="flex-1 bg-green-600 hover:bg-green-500 text-white font-bold py-4 rounded-xl"
                  >
                    Imprimir Cupom
                  </button>
                  <button
                    onClick={() => alert('Simulando envio de email...')}
                    className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-xl"
                  >
                    Enviar Email
                  </button>
                </div>
              </div>
            )}

            {fiscalState === 'failed' && (
              <div className="flex flex-col items-center w-full max-w-xl">
                <svg
                  className="w-20 h-20 text-red-500 mb-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <h2 className="text-3xl font-bold text-red-400 mb-2">Falha na Emissão</h2>
                <p className="text-gray-300 mb-8 w-full">{errorMsg}</p>
                <div className="flex gap-4 w-full">
                  <button
                    onClick={() => handleConfirm(activeTab, currentSaleId!)}
                    className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-xl"
                  >
                    Tentar Novamente
                  </button>
                  <button
                    onClick={handleSkipFiscal}
                    className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-bold py-4 rounded-xl"
                  >
                    Continuar sem NF
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Botão Cancelar FLutuante fora do Card para foco imediato */}
      {fiscalState === 'idle' && (
        <button
          onClick={onClose}
          className="absolute top-8 right-8 text-white hover:text-red-400 bg-gray-800 border border-gray-700 hover:border-red-400 px-6 py-3 rounded-lg font-bold text-xl transition-all"
        >
          VOLTAR (ESC)
        </button>
      )}
    </div>
  );
}
