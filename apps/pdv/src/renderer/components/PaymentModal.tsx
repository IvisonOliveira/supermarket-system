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
  const [focusedPanel, setFocusedPanel] = useState<'methods' | 'content'>('methods');
  const [focusedActionIndex, setFocusedActionIndex] = useState<number>(0);
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
      setFocusedActionIndex(0);
      setFocusedPanel('methods');
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // ── Telas pós-confirmação (emitting/success/failed) ──
      if (fiscalState !== 'idle') {
        if (fiscalState === 'success') {
          const actions = ['close', 'print', 'email'];
          if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
            e.preventDefault();
            if (e.key === 'ArrowRight' || e.key === 'ArrowDown')
              setFocusedActionIndex((prev) => Math.min(prev + 1, actions.length - 1));
            else
              setFocusedActionIndex((prev) => Math.max(prev - 1, 0));
            return;
          }
          if (e.key === 'Enter') {
            e.preventDefault();
            if (focusedActionIndex === 0) onSuccess();
            if (focusedActionIndex === 1) alert('Simulando impressão...');
            if (focusedActionIndex === 2) alert('Simulando envio de email...');
            return;
          }
        }
        if (fiscalState === 'failed') {
          const actions = ['retry', 'skip'];
          if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
            e.preventDefault();
            if (e.key === 'ArrowRight' || e.key === 'ArrowDown')
              setFocusedActionIndex((prev) => Math.min(prev + 1, actions.length - 1));
            else
              setFocusedActionIndex((prev) => Math.max(prev - 1, 0));
            return;
          }
          if (e.key === 'Enter') {
            e.preventDefault();
            if (focusedActionIndex === 0) handleConfirm(activeTab === 'dinheiro' ? 'dinheiro' : activeTab === 'pix' ? 'pix' : 'cartao_credito', currentSaleId!);
            if (focusedActionIndex === 1) handleSkipFiscal();
            return;
          }
        }
        return;
      }

      // ── Tela idle ──
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }

      if (e.key === 'Tab') {
        e.preventDefault();
        setFocusedPanel((prev) => {
          const next = prev === 'methods' ? 'content' : 'methods';
          if (next === 'content') {
            setTimeout(() => {
              const input = receivedInputRef.current;
              if (input) {
                input.focus();
                input.select();
              }
            }, 50);
          } else receivedInputRef.current?.blur();
          return next;
        });
        return;
      }

      if (focusedPanel === 'methods') {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          if (activeTab === 'dinheiro') setActiveTab('pix');
          else if (activeTab === 'pix') setActiveTab('cartao');
          return;
        }
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          if (activeTab === 'cartao') setActiveTab('pix');
          else if (activeTab === 'pix') {
            setActiveTab('dinheiro');
            setTimeout(() => receivedInputRef.current?.focus(), 50);
          }
          return;
        }
        if (e.key === '1') { e.preventDefault(); setActiveTab('dinheiro'); return; }
        if (e.key === '2') { e.preventDefault(); setActiveTab('pix'); return; }
        if (e.key === '3') { e.preventDefault(); setActiveTab('cartao'); return; }
      }

      if (e.key === 'Enter') {
        e.preventDefault();
        const isValid = receivedAmount >= total;
        if (activeTab === 'dinheiro' && isValid) handleConfirm('dinheiro');
        if (activeTab === 'pix') handleConfirm('pix');
        if (activeTab === 'cartao') handleConfirm('cartao_credito');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, activeTab, receivedAmount, total, fiscalState, focusedPanel, focusedActionIndex]);

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

  const btnGold =
    'bg-[#C9A227] text-[#1B2A5E] font-black rounded-xl transition-all shadow-[0_0_18px_rgba(201,162,39,0.3)] hover:bg-[#e9be43] hover:shadow-[0_0_32px_rgba(201,162,39,0.6)] active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-[#0f1932] border border-[#1B2A5E] w-full max-w-4xl rounded-2xl shadow-2xl flex flex-col md:flex-row overflow-hidden text-white font-sans">
        {fiscalState === 'idle' ? (
          <>
            {/* Lado Esquerdo - Totais e Métodos */}
            <div className={`w-full md:w-1/3 bg-[#0a111f] p-8 border-r border-[#1B2A5E] flex flex-col min-h-[480px] h-[480px] ${focusedPanel === 'methods' ? 'ring-2 ring-[#C9A227] rounded-l-2xl' : ''}`}>
              <div className="flex gap-2 mb-4">
                <span className={`text-xs font-bold tracking-widest px-3 py-1 rounded-full border transition-all ${focusedPanel === 'methods' ? 'bg-[#C9A227] text-[#0f1932] border-[#C9A227]' : 'text-slate-600 border-slate-700'}`}>
                  MÉTODOS
                </span>
                <span className={`text-xs font-bold tracking-widest px-3 py-1 rounded-full border transition-all ${focusedPanel === 'content' ? 'bg-[#C9A227] text-[#0f1932] border-[#C9A227]' : 'text-slate-600 border-slate-700'}`}>
                  VALOR
                </span>
              </div>
              <h2 className="text-2xl text-slate-400 font-bold tracking-widest mb-2">
                TOTAL DA VENDA
              </h2>
              <div className="text-6xl font-black text-[#C9A227] mb-8 tracking-tighter drop-shadow-[0_0_12px_rgba(201,162,39,0.4)]">
                R$ {total.toFixed(2)}
              </div>

              <div className="space-y-4 mt-auto">
                <button
                  onClick={() => {
                    setActiveTab('dinheiro');
                    setTimeout(() => receivedInputRef.current?.focus(), 10);
                  }}
                  className={`w-full py-4 px-6 text-xl font-bold rounded-lg transition-all ${activeTab === 'dinheiro' ? 'bg-[#C9A227] text-[#1B2A5E] shadow-[0_0_16px_rgba(201,162,39,0.4)]' : 'bg-[#152248] text-slate-300 hover:bg-[#1B2A5E] border border-[#1B2A5E]'}`}
                >
                  Dinheiro
                </button>
                <button
                  onClick={() => setActiveTab('pix')}
                  className={`w-full py-4 px-6 text-xl font-bold rounded-lg transition-all ${activeTab === 'pix' ? 'bg-[#C9A227] text-[#1B2A5E] shadow-[0_0_16px_rgba(201,162,39,0.4)]' : 'bg-[#152248] text-slate-300 hover:bg-[#1B2A5E] border border-[#1B2A5E]'}`}
                >
                  PIX
                </button>
                <button
                  onClick={() => setActiveTab('cartao')}
                  className={`w-full py-4 px-6 text-xl font-bold rounded-lg transition-all ${activeTab === 'cartao' ? 'bg-[#C9A227] text-[#1B2A5E] shadow-[0_0_16px_rgba(201,162,39,0.4)]' : 'bg-[#152248] text-slate-300 hover:bg-[#1B2A5E] border border-[#1B2A5E]'}`}
                >
                  Cartão
                </button>
              </div>
            </div>

            {/* Lado Direito - Conteúdo da Aba */}
            <div className={`w-full md:w-2/3 p-8 flex flex-col items-center justify-center bg-[#0f1932] border-t md:border-t-0 md:border-l border-[#1B2A5E] min-h-[480px] h-[480px] ${focusedPanel === 'content' ? 'ring-2 ring-[#C9A227] rounded-r-2xl' : ''}`}>
              {activeTab === 'dinheiro' && (
                <div className="w-full max-w-md flex flex-col items-center space-y-8">
                  <div className="w-full">
                    <label className="text-2xl text-slate-400 font-bold block mb-4 text-center">
                      Valor Recebido
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-4xl text-slate-500 font-black">
                        R$
                      </span>
                      <input
                        ref={receivedInputRef}
                        type="number"
                        min="0"
                        step="0.01"
                        className="w-full bg-[#152248] border-2 border-[#1B2A5E] rounded-xl text-5xl font-black py-6 pl-20 pr-6 outline-none focus:border-[#C9A227] focus:ring-2 focus:ring-[#C9A227]/30 transition-colors shadow-inner text-center"
                        value={receivedAmount || ''}
                        onChange={(e) => setReceivedAmount(Number(e.target.value) || 0)}
                        onKeyDown={(e) => {
                          // Permite digitação direta pelo teclado numérico
                          if (e.key >= '0' && e.key <= '9') {
                            e.preventDefault();
                            setReceivedAmount((prev) => {
                              const str = (prev * 100).toFixed(0) + e.key;
                              return Number(str) / 100;
                            });
                          }
                          if (e.key === 'Backspace') {
                            e.preventDefault();
                            setReceivedAmount((prev) => {
                              const str = (prev * 100).toFixed(0).slice(0, -1) || '0';
                              return Number(str) / 100;
                            });
                          }
                        }}
                      />
                    </div>
                  </div>

                  <div className="w-full bg-[#152248] p-6 rounded-xl border border-[#1B2A5E] text-center shadow-inner">
                    <span className="text-xl text-slate-400 font-medium block mb-2">Troco</span>
                    <span
                      className={`text-6xl font-black block ${change > 0 ? 'text-orange-400' : 'text-slate-500'}`}
                    >
                      R$ {change.toFixed(2)}
                    </span>
                  </div>

                  <button
                    disabled={!isDinheiroValid}
                    onClick={() => handleConfirm('dinheiro')}
                    className={`w-full py-6 text-3xl ${btnGold}`}
                  >
                    CONFIRMAR
                  </button>
                </div>
              )}

              {activeTab === 'pix' && (
                <div className="w-full max-w-md flex flex-col items-center justify-center h-full space-y-10">
                  <div className="w-64 h-64 bg-[#152248] border-4 border-dashed border-[#1B2A5E] rounded-2xl flex items-center justify-center p-4">
                    <p className="text-center text-slate-400 text-xl font-medium">
                      QR Code será exibido aqui
                    </p>
                  </div>

                  <button
                    onClick={() => handleConfirm('pix')}
                    className={`w-full py-6 text-3xl flex items-center justify-center gap-3 ${btnGold}`}
                  >
                    <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                    </svg>
                    CONFIRMAR PIX RECEBIDO
                  </button>
                </div>
              )}

              {activeTab === 'cartao' && (
                <div className="w-full max-w-md flex flex-col items-center justify-center h-full space-y-10">
                  <div className="w-full py-16 bg-[#152248] border border-[#1B2A5E] rounded-2xl flex flex-col items-center justify-center shadow-inner">
                    <svg
                      className="w-20 h-20 text-slate-600 mb-6"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                      />
                    </svg>
                    <p className="text-center text-slate-400 text-xl font-medium px-4">
                      Aguardando integração TEF
                    </p>
                  </div>

                  <button
                    onClick={() => handleConfirm('cartao_credito')}
                    className={`w-full py-6 text-2xl ${btnGold}`}
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
                <div className="w-16 h-16 border-4 border-[#C9A227] border-t-transparent rounded-full animate-spin mb-6"></div>
                <h2 className="text-3xl font-bold text-white">Emitindo NFC-e...</h2>
                <p className="text-slate-400 mt-4">Aguardando autorização da Sefaz</p>
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
                <div className="bg-[#152248] p-4 rounded-lg border border-[#1B2A5E] w-full my-6 text-center">
                  <p className="text-sm text-slate-400 mb-1">Chave de Acesso:</p>
                  <p className="font-mono text-lg break-all text-white">{accessKey}</p>
                </div>
                <div className="flex gap-4 w-full">
                  <button
                    onClick={onSuccess}
                    className={`flex-1 bg-[#152248] hover:bg-[#1B2A5E] border border-[#1B2A5E] text-white font-bold py-4 rounded-xl transition-all ${focusedActionIndex === 0 ? 'ring-2 ring-[#C9A227]' : ''}`}
                  >
                    Fechar
                  </button>
                  <button
                    onClick={() => alert('Simulando impressão...')}
                    className={`flex-1 py-4 text-base ${btnGold} ${focusedActionIndex === 1 ? 'ring-2 ring-[#C9A227]' : ''}`}
                  >
                    Imprimir Cupom
                  </button>
                  <button
                    onClick={() => alert('Simulando envio de email...')}
                    className={`flex-1 bg-[#152248] hover:bg-[#1B2A5E] border border-[#1B2A5E] text-white font-bold py-4 rounded-xl transition-all ${focusedActionIndex === 2 ? 'ring-2 ring-[#C9A227]' : ''}`}
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
                <p className="text-slate-300 mb-8 w-full">{errorMsg}</p>
                <div className="flex gap-4 w-full">
                  <button
                    onClick={() => handleConfirm(activeTab, currentSaleId!)}
                    className={`flex-1 py-4 text-base ${btnGold} ${focusedActionIndex === 0 ? 'ring-2 ring-[#C9A227]' : ''}`}
                  >
                    Tentar Novamente
                  </button>
                  <button
                    onClick={handleSkipFiscal}
                    className={`flex-1 bg-[#152248] hover:bg-[#1B2A5E] border border-[#1B2A5E] text-white font-bold py-4 rounded-xl transition-all ${focusedActionIndex === 1 ? 'ring-2 ring-[#C9A227]' : ''}`}
                  >
                    Continuar sem NF
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Botão Cancelar flutuante */}
      {fiscalState === 'idle' && (
        <button
          onClick={onClose}
          className="absolute top-8 right-8 text-white hover:text-red-400 bg-[#0f1932] border border-[#1B2A5E] hover:border-red-400 px-6 py-3 rounded-lg font-bold text-xl transition-all"
        >
          VOLTAR (ESC)
        </button>
      )}
    </div>
  );
}
