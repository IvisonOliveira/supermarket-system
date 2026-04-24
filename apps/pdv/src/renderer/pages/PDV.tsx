import type { KeyboardEvent } from 'react';
import { useState, useEffect, useRef } from 'react';

import type { Product } from '../../shared/ipc-channels';
import PaymentModal from '../components/PaymentModal';

export interface SaleItem extends Product {
  quantity: number;
  subtotal: number;
  isWeighing?: boolean;
}

export default function PDV() {
  const [items, setItems] = useState<SaleItem[]>([]);
  const [discount, setDiscount] = useState<number>(0);
  const [discountPct, setDiscountPct] = useState<number>(0);
  const [discountFocus, setDiscountFocus] = useState<'value' | 'pct'>('value');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [currentScaleWeight, setCurrentScaleWeight] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState<number>(0);

  // Edição inline de quantidade (F2) — substitui window.prompt que não funciona no Electron
  const [editingQtyIndex, setEditingQtyIndex] = useState<number | null>(null);
  const [editingQtyValue, setEditingQtyValue] = useState('');

  // Índice do item destacado no painel de busca/atalhos (-1 = nenhum)
  const [searchNavIndex, setSearchNavIndex] = useState(-1);

  // Modo carrinho: setas navegam o carrinho em vez do painel direito
  const [cartNavMode, setCartNavMode] = useState(false);

  const searchInputRef = useRef<HTMLInputElement>(null);

  // ─── Funções de manipulação ────────────────────────────────────────────────

  const addItem = (product: Product, qty: number = 1) => {
    setItems((prev) => {
      if (product.unit === 'kg') {
        return [{ ...product, quantity: 0, subtotal: 0, isWeighing: true }, ...prev];
      }
      const existing = prev.find((i) => i.id === product.id);
      if (existing) {
        return prev.map((i) =>
          i.id === product.id
            ? { ...i, quantity: i.quantity + qty, subtotal: (i.quantity + qty) * i.price }
            : i,
        );
      }
      return [{ ...product, quantity: qty, subtotal: product.price * qty }, ...prev];
    });
    setSearchQuery('');
    setSearchResults([]);
    setSelectedIndex(0);
    setSearchNavIndex(-1);
    setCartNavMode(false);
    setTimeout(() => searchInputRef.current?.focus(), 10);
  };

  const removeItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
    setSelectedIndex((prev) => Math.max(0, Math.min(prev, items.length - 2)));
    setTimeout(() => searchInputRef.current?.focus(), 10);
  };

  const updateQty = (index: number, qty: number) => {
    if (qty <= 0) return;
    setItems((prev) =>
      prev.map((item, i) =>
        i === index ? { ...item, quantity: qty, subtotal: qty * item.price } : item,
      ),
    );
  };

  const confirmEditingQty = () => {
    if (editingQtyIndex === null) return;
    const qty = parseFloat(editingQtyValue);
    if (!isNaN(qty) && qty > 0) updateQty(editingQtyIndex, qty);
    setEditingQtyIndex(null);
    setTimeout(() => searchInputRef.current?.focus(), 10);
  };

  const clearSale = () => {
    setItems([]);
    setDiscount(0);
    setDiscountPct(0);
    setSearchQuery('');
    setSearchResults([]);
    setSelectedIndex(0);
    setSearchNavIndex(-1);
    setCartNavMode(false);
    setTimeout(() => searchInputRef.current?.focus(), 10);
  };

  const calculateTotal = () => {
    const sub = items.reduce((acc, item) => acc + item.subtotal, 0);
    return Math.max(0, sub - discount);
  };

  const handleDiscountValueChange = (value: number) => {
    const sub = items.reduce((acc, item) => acc + item.subtotal, 0);
    setDiscount(value);
    setDiscountPct(sub > 0 ? Number(((value / sub) * 100).toFixed(2)) : 0);
  };

  const handleDiscountPctChange = (pct: number) => {
    const sub = items.reduce((acc, item) => acc + item.subtotal, 0);
    setDiscountPct(pct);
    setDiscount(Number(((pct / 100) * sub).toFixed(2)));
  };

  // ─── Efeitos ─────────────────────────────────────────────────────────────────

  // Balança
  useEffect(() => {
    if (!window.electronAPI?.scale?.onWeight) return;
    const cleanup = window.electronAPI.scale.onWeight((weight: number) => {
      setCurrentScaleWeight(weight);
    });
    return () => cleanup();
  }, []);

  // Scanner via IPC
  useEffect(() => {
    if (!window.electronAPI?.barcode?.onScanned) return;
    const cleanup = window.electronAPI.barcode.onScanned(
      async ({ code }: { code: string; isScanner: boolean }) => {
        try {
          const product = await window.electronAPI.db.getProductByBarcode(code);
          if (product) addItem(product, 1);
          else alert('Produto não encontrado');
        } catch (err) {
          console.error('Erro na busca de barcode via IPC:', err);
        }
      },
    );
    return () => cleanup();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Busca com debounce; reseta navegação no painel direito ao digitar
  useEffect(() => {
    setSearchNavIndex(-1);

    if (!searchQuery.trim()) {
      if (window.electronAPI?.db?.getProducts) {
        window.electronAPI.db.getProducts().then(setSearchResults).catch(console.error);
      }
      return;
    }

    const t = setTimeout(() => {
      if (window.electronAPI?.db?.searchProducts) {
        window.electronAPI.db
          .searchProducts(searchQuery)
          .then(setSearchResults)
          .catch(console.error);
      }
    }, 200);

    return () => clearTimeout(t);
  }, [searchQuery]);

  // ─── Atalhos globais + navegação por teclado ─────────────────────────────────
  useEffect(() => {
    if (isPaymentOpen) return;

    const handleKeyDown = (e: globalThis.KeyboardEvent) => {
      // Quando a edição inline de quantidade está ativa, apenas Escape cancela
      if (editingQtyIndex !== null) {
        if (e.key === 'Escape') {
          e.preventDefault();
          setEditingQtyIndex(null);
          setTimeout(() => searchInputRef.current?.focus(), 10);
        }
        return;
      }

      const isSearchFocused = document.activeElement === searchInputRef.current;

      // F1 — volta ao modo busca
      if (e.key === 'F1') {
        e.preventDefault();
        setCartNavMode(false);
        setSearchNavIndex(-1);
        setTimeout(() => searchInputRef.current?.focus(), 10);
        return;
      }

      // F2 — edição inline de quantidade do item selecionado
      if (e.key === 'F2') {
        e.preventDefault();
        if (items.length > 0) {
          const item = items[selectedIndex];
          setEditingQtyValue(
            item.unit === 'kg' ? item.quantity.toFixed(3) : item.quantity.toString(),
          );
          setEditingQtyIndex(selectedIndex);
        }
        return;
      }

      // F3 — foca campo de desconto (sem window.prompt)
      if (e.key === 'F3') {
        e.preventDefault();
        if (discountFocus === 'value') {
          setDiscountFocus('pct');
          setTimeout(() => document.getElementById('discount-pct')?.focus(), 10);
        } else {
          setDiscountFocus('value');
          setTimeout(() => document.getElementById('discount')?.focus(), 10);
        }
        return;
      }

      if (e.key === 'F5') {
        e.preventDefault();
        if (items.length > 0) setIsPaymentOpen(true);
        return;
      }

      if (e.key === 'F8') {
        e.preventDefault();
        if (items.length > 0 && window.confirm('Deseja realmente cancelar a venda atual?'))
          clearSale();
        return;
      }

      if (e.key === 'F4' || e.key === 'Delete') {
        if (isSearchFocused && e.key === 'Delete' && searchQuery.length > 0) return;
        e.preventDefault();
        if (items.length > 0) removeItem(selectedIndex);
        return;
      }

      // ── Setas ────────────────────────────────────────────────────────────────────
      // cartNavMode=false → setas navegam painel direito (busca/atalhos)
      // cartNavMode=true  → setas navegam carrinho

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (!cartNavMode) {
          if (searchResults.length > 0)
            setSearchNavIndex((prev) =>
              prev === -1 ? 0 : Math.min(prev + 1, searchResults.length - 1),
            );
        } else {
          setSelectedIndex((prev) => Math.min(items.length - 1, prev + 1));
        }
        return;
      }

      if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (!cartNavMode) {
          if (searchNavIndex > 0) setSearchNavIndex((prev) => prev - 1);
          else if (searchNavIndex === 0) setSearchNavIndex(-1);
        } else {
          setSelectedIndex((prev) => Math.max(0, prev - 1));
        }
        return;
      }

      // Enter com item destacado no painel direito
      if (e.key === 'Enter' && searchNavIndex >= 0 && !isSearchFocused) {
        e.preventDefault();
        const product = searchResults[searchNavIndex];
        if (product) addItem(product);
        return;
      }

      // Escape — alterna modo busca ↔ modo carrinho via estado explícito
      if (e.key === 'Escape') {
        e.preventDefault();
        if (searchNavIndex >= 0) {
          setSearchNavIndex(-1);
        } else if (!cartNavMode) {
          setCartNavMode(true);
          searchInputRef.current?.blur();
        } else {
          setCartNavMode(false);
          setSearchNavIndex(-1);
          setTimeout(() => searchInputRef.current?.focus(), 10);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    isPaymentOpen,
    items,
    selectedIndex,
    discount,
    searchQuery,
    searchResults,
    editingQtyIndex,
    searchNavIndex,
    cartNavMode,
    discountFocus,
  ]);

  // Scroll automático — item do carrinho selecionado
  useEffect(() => {
    const el = document.getElementById(`item-${selectedIndex}`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [selectedIndex, items.length]);

  // Scroll automático — item destacado no painel de busca/atalhos
  useEffect(() => {
    if (searchNavIndex < 0) return;
    const el = document.getElementById(`result-${searchNavIndex}`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [searchNavIndex]);

  // ─── Handler do input de busca (Enter e setas) ────────────────────────
  const handleSearchKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (searchNavIndex >= 0 && searchResults[searchNavIndex]) {
        // Adiciona o produto destacado pelas setas
        addItem(searchResults[searchNavIndex]);
      } else {
        // Comportamento original: código de barras exato ou primeiro resultado
        const match = searchResults.find((p) => p.barcode === searchQuery || p.id === searchQuery);
        if (match) addItem(match, 1);
        else if (searchResults.length > 0) addItem(searchResults[0], 1);
      }
    }
  };

  // ─── JSX ─────────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-screen bg-[#0a111f] text-white overflow-hidden font-sans">
      {/* PAINEL ESQUERDO: VENDA ATUAL (60%) */}
      <div className="w-[60%] flex flex-col border-r border-[#1B2A5E] bg-[#0f1932]">
        {/* Lista de itens */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          {items.length === 0 ? (
            <div className="flex items-center justify-center h-full text-slate-500 text-2xl font-light">
              Caixa Livre - Passe o primeiro item...
            </div>
          ) : (
            items.map((item, index) => (
              <div
                id={`item-${index}`}
                key={`${item.id}-${index}`}
                className={`flex justify-between items-center p-4 rounded-lg text-lg shadow-sm border transition-all ${
                  index === selectedIndex
                    ? 'bg-[#1B2A5E] border-[#C9A227] ring-2 ring-[#C9A227]/40'
                    : 'bg-[#152248] border-[#1B2A5E]'
                }`}
              >
                <div className="flex-1 pr-4">
                  <span className="text-white block text-2xl font-bold truncate">{item.name}</span>
                  <span className="text-sm text-gray-400 font-mono mt-1 block">{item.barcode}</span>
                </div>
                <div className="flex items-center gap-6 text-gray-300">
                  <div className="flex items-center">
                    {item.isWeighing ? (
                      <>
                        <span className="w-24 text-center font-bold text-[#C9A227] text-3xl mr-4">
                          {currentScaleWeight.toFixed(3)} kg
                        </span>
                        <button
                          onClick={() => {
                            const weight = currentScaleWeight > 0 ? currentScaleWeight : 1;
                            setItems((prev) =>
                              prev.map((it, i) =>
                                i === index
                                  ? {
                                      ...it,
                                      quantity: weight,
                                      subtotal: weight * it.price,
                                      isWeighing: false,
                                    }
                                  : it,
                              ),
                            );
                          }}
                          className="px-4 py-2 bg-[#1B2A5E] border border-[#C9A227] rounded hover:bg-[#C9A227] hover:text-[#1B2A5E] font-bold text-white transition-colors"
                        >
                          Usar Peso
                        </button>
                      </>
                    ) : editingQtyIndex === index ? (
                      // ── Edição inline de quantidade (F2) ──
                      <input
                        autoFocus
                        type="number"
                        min="0.001"
                        step={item.unit === 'kg' ? '0.001' : '1'}
                        value={editingQtyValue}
                        onChange={(e) => setEditingQtyValue(e.target.value)}
                        onFocus={(e) => e.target.select()}
                        onBlur={confirmEditingQty}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            confirmEditingQty();
                          }
                          if (e.key === 'Escape') {
                            e.preventDefault();
                            setEditingQtyIndex(null);
                            setTimeout(() => searchInputRef.current?.focus(), 10);
                          }
                        }}
                        className="w-28 bg-[#0a111f] border-2 border-[#C9A227] rounded-lg text-center text-2xl font-bold text-white outline-none ring-2 ring-[#C9A227]/40 py-1"
                      />
                    ) : (
                      <>
                        <button
                          onClick={() => updateQty(index, item.quantity - 1)}
                          className="px-3 py-1 bg-[#0f1932] border border-[#1B2A5E] rounded hover:bg-[#1B2A5E] font-bold text-xl transition-colors"
                        >
                          -
                        </button>
                        <span className="w-16 text-center font-bold text-2xl">
                          {item.unit === 'kg' ? item.quantity.toFixed(3) : item.quantity}
                        </span>
                        <button
                          onClick={() => updateQty(index, item.quantity + 1)}
                          className="px-3 py-1 bg-[#0f1932] border border-[#1B2A5E] rounded hover:bg-[#1B2A5E] font-bold text-xl transition-colors"
                        >
                          +
                        </button>
                      </>
                    )}
                  </div>
                  <span className="w-28 text-right text-slate-400">R$ {item.price.toFixed(2)}</span>
                  <span className="w-36 text-right font-black text-[#C9A227] text-3xl">
                    R$ {item.subtotal.toFixed(2)}
                  </span>
                  <button
                    onClick={() => removeItem(index)}
                    className="text-red-400 hover:text-red-300 ml-2 font-bold p-2 text-2xl transition-colors"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Rodapé fixo - Totais */}
        <div className="bg-[#0a111f] p-8 border-t border-[#1B2A5E] shadow-[0_-10px_20px_rgba(0,0,0,0.3)]">
          <div className="flex justify-between items-end mb-6 text-slate-300">
            <div>
              <p className="text-2xl text-slate-400">
                Itens:{' '}
                <span className="font-bold text-white ml-2">
                  {items.reduce((acc, i) => acc + i.quantity, 0)}
                </span>
              </p>
              <div className="flex items-center gap-4 mt-4">
                <label className="text-2xl text-slate-400 whitespace-nowrap">Desconto:</label>
                <div className="flex items-center group">
                  <span className="text-white text-2xl mr-1">R$</span>
                  <input
                    id="discount"
                    type="number"
                    min="0"
                    step="0.01"
                    className="bg-transparent border-b-2 border-[#1B2A5E] text-3xl font-bold w-28 outline-none focus:border-[#C9A227] group-hover:border-slate-500 transition-colors pt-1"
                    value={discount || ''}
                    onChange={(e) => handleDiscountValueChange(Number(e.target.value) || 0)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === 'Escape') {
                        e.preventDefault();
                        searchInputRef.current?.focus();
                      }
                    }}
                    placeholder="0.00"
                  />
                </div>
                <div className="flex items-center group">
                  <span className="text-slate-400 text-2xl mr-1">%</span>
                  <input
                    id="discount-pct"
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    className="bg-transparent border-b-2 border-[#1B2A5E] text-3xl font-bold w-20 outline-none focus:border-[#C9A227] group-hover:border-slate-500 transition-colors pt-1"
                    value={discountPct || ''}
                    onChange={(e) => handleDiscountPctChange(Number(e.target.value) || 0)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === 'Escape') {
                        e.preventDefault();
                        searchInputRef.current?.focus();
                      }
                    }}
                    placeholder="0.0"
                  />
                </div>
              </div>
            </div>
            <div className="text-right">
              <p className="text-3xl text-slate-400 mb-2 font-medium tracking-wide">TOTAL GERAL</p>
              <p className="text-7xl font-black text-[#C9A227] tracking-tighter drop-shadow-[0_0_12px_rgba(201,162,39,0.4)]">
                R$ {calculateTotal().toFixed(2)}
              </p>
            </div>
          </div>
          <div className="flex gap-4">
            <button
              onClick={clearSale}
              className="flex-1 bg-red-700/80 hover:bg-red-600 text-white text-2xl font-bold py-6 rounded-lg transition-colors shadow-lg active:scale-95"
            >
              CANCELAR
            </button>
            <button
              disabled={items.length === 0}
              onClick={() => setIsPaymentOpen(true)}
              className="flex-[3] bg-[#C9A227] text-[#1B2A5E] disabled:opacity-40 disabled:cursor-not-allowed text-4xl font-black py-6 rounded-lg transition-all shadow-[0_0_24px_rgba(201,162,39,0.35)] hover:bg-[#e9be43] hover:shadow-[0_0_40px_rgba(201,162,39,0.65)] active:scale-[0.98]"
            >
              FINALIZAR VENDA
            </button>
          </div>
        </div>
      </div>

      {/* PAINEL DIREITO: BUSCA E ATALHOS (40%) */}
      <div className="w-[40%] flex flex-col p-8 bg-[#0a111f] border-l border-[#1B2A5E]/50 shadow-[-10px_0_20px_rgba(0,0,0,0.3)] z-10 relative">
        {/* Logo */}
        <div className="flex justify-center mb-6">
          <img
            src="/logos/OmniMarket-Dark-Transparent.png"
            alt="OmniMarket"
            className="h-40 drop-shadow-[0_0_18px_rgba(201,162,39,0.25)]"
          />
        </div>

        <input
          ref={searchInputRef}
          autoFocus
          className="w-full bg-[#0f1932] border-2 border-[#1B2A5E] text-white text-4xl font-mono p-6 rounded-lg shadow-inner outline-none focus:border-[#C9A227] focus:ring-2 focus:ring-[#C9A227]/30 transition-all placeholder-slate-600 mb-8"
          placeholder="CÓDIGO DE BARRAS"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={handleSearchKeyDown}
        />

        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
          {searchQuery.trim() ? (
            <div className="space-y-3">
              <h3 className="text-slate-500 mb-4 font-bold tracking-widest text-sm uppercase">
                Resultados ({searchResults.length})
              </h3>
              {searchResults.length === 0 ? (
                <div className="p-8 bg-[#0f1932]/50 rounded-lg text-center border border-[#1B2A5E] border-dashed">
                  <p className="text-slate-400 text-xl">Nenhum produto encontrado</p>
                  <p className="text-slate-500 mt-2 text-sm">Verifique o código ou descrição</p>
                </div>
              ) : (
                searchResults.map((p, idx) => (
                  <button
                    id={`result-${idx}`}
                    key={p.id}
                    onClick={() => addItem(p)}
                    className={`w-full text-left p-5 rounded-lg mb-3 transition-colors flex justify-between items-center outline-none border group ${
                      searchNavIndex === idx
                        ? 'bg-[#1B2A5E] border-[#C9A227] ring-2 ring-[#C9A227]/40'
                        : 'bg-[#0f1932] hover:bg-[#1B2A5E] border-[#1B2A5E] hover:border-[#C9A227]'
                    }`}
                  >
                    <div>
                      <div className="text-2xl font-bold text-slate-100 group-hover:text-white truncate max-w-[280px]">
                        {p.name}
                      </div>
                      <div className="text-base font-mono text-slate-500 mt-2">{p.barcode}</div>
                    </div>
                    <div
                      className={`text-2xl font-black ${searchNavIndex === idx ? 'text-[#C9A227]' : 'text-[#C9A227] group-hover:text-[#e9be43]'}`}
                    >
                      R$ {p.price.toFixed(2)}
                    </div>
                  </button>
                ))
              )}
            </div>
          ) : (
            <div>
              <h3 className="text-slate-500 mb-5 font-bold tracking-widest text-sm uppercase flex items-center justify-between">
                <span>Atalhos Rápidos</span>
                <span className="text-xs bg-[#0f1932] border border-[#1B2A5E] px-2 py-1 rounded text-slate-400">
                  Top 12
                </span>
              </h3>
              <div className="grid grid-cols-2 2xl:grid-cols-3 gap-4">
                {searchResults.slice(0, 12).map((p, idx) => (
                  <button
                    id={`result-${idx}`}
                    key={p.id}
                    onClick={() => addItem(p)}
                    className={`p-5 rounded-lg flex flex-col items-center justify-between aspect-square transition-colors shadow border active:scale-95 group ${
                      searchNavIndex === idx
                        ? 'bg-[#1B2A5E] border-[#C9A227] ring-2 ring-[#C9A227]/40'
                        : 'bg-[#0f1932] hover:bg-[#1B2A5E] border-[#1B2A5E] hover:border-[#C9A227]'
                    }`}
                  >
                    <span className="text-center w-full mb-3 text-xl font-semibold text-slate-300 group-hover:text-white line-clamp-3 leading-snug">
                      {p.name}
                    </span>
                    <span className="text-[#C9A227] text-3xl font-black mt-auto">
                      R$ {p.price.toFixed(2)}
                    </span>
                  </button>
                ))}
                {searchResults.length === 0 && (
                  <div className="col-span-full h-40 flex items-center justify-center text-slate-500 text-xl font-light bg-[#0f1932]/30 rounded-lg border border-[#1B2A5E] border-dashed">
                    Carregando catálogo...
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* BARRA DE ATALHOS GLOBAL */}
      <div className="absolute bottom-0 right-0 w-[40%] bg-[#060c18] border-t border-[#1B2A5E] py-2 px-4 shadow-[0_-5px_10px_rgba(0,0,0,0.4)] z-50">
        <p className="text-slate-600 text-xs font-mono font-medium tracking-wide text-center">
          <span className="text-[#C9A227] font-bold ml-3">F1</span> Busca |
          <span className="text-[#C9A227] font-bold ml-3">F2</span> Qtd |
          <span className="text-[#C9A227] font-bold ml-3">F3</span> Desc R$/% |
          <span className="text-[#C9A227] font-bold ml-3">F5</span> Pagar |
          <span className="text-[#C9A227] font-bold ml-3">F8</span> Cancelar |
          <span className="text-[#C9A227] font-bold ml-3">Del/F4</span> Remover |
          <span className="text-[#C9A227] font-bold ml-3">↑↓</span> Navegar |
          <span className="text-[#C9A227] font-bold ml-3">Esc</span> Modo
        </p>
      </div>

      <PaymentModal
        isOpen={isPaymentOpen}
        onClose={() => setIsPaymentOpen(false)}
        onSuccess={() => {
          clearSale();
          setIsPaymentOpen(false);
        }}
        items={items}
        total={calculateTotal()}
        discount={discount}
      />
    </div>
  );
}
