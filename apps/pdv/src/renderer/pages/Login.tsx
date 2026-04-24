import { useState } from 'react';

interface Props {
  onLogin: (user: any) => void;
}

export default function Login({ onLogin }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!email || !password) return;
    setLoading(true);
    setError('');
    try {
      const result = await window.electronAPI.auth.login(email, password);
      onLogin(result.user);
    } catch (err: any) {
      setError(err.message || 'Erro ao fazer login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen bg-[#0a111f] text-white items-center justify-center">
      <div className="w-full max-w-sm p-10 bg-[#0f1932] rounded-2xl border border-[#1B2A5E] shadow-[0_0_60px_rgba(201,162,39,0.08)] flex flex-col items-center">

        <img
          src="/logos/OmniMarket-Dark-Transparent.png"
          alt="OmniMarket"
          className="h-36 mb-8 drop-shadow-[0_0_18px_rgba(201,162,39,0.25)]"
        />

        <p className="text-slate-500 text-xs font-bold tracking-[0.3em] uppercase mb-8">
          Acesso ao Caixa
        </p>

        <div className="w-full flex flex-col gap-4 mb-6">
          <input
            type="email"
            placeholder="E-mail"
            value={email}
            autoFocus
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && document.getElementById('pwd')?.focus()}
            className="w-full bg-[#0a111f] border-2 border-[#1B2A5E] text-white text-lg font-mono p-4 rounded-lg outline-none focus:border-[#C9A227] focus:ring-2 focus:ring-[#C9A227]/20 transition-all placeholder-slate-600"
          />
          <input
            id="pwd"
            type="password"
            placeholder="Senha"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            className="w-full bg-[#0a111f] border-2 border-[#1B2A5E] text-white text-lg font-mono p-4 rounded-lg outline-none focus:border-[#C9A227] focus:ring-2 focus:ring-[#C9A227]/20 transition-all placeholder-slate-600"
          />
        </div>

        {error && (
          <div className="w-full mb-4 px-4 py-3 bg-red-900/30 border border-red-700/50 rounded-lg">
            <p className="text-red-400 text-sm font-medium text-center">{error}</p>
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full bg-[#C9A227] text-[#0f1932] text-2xl font-black py-5 rounded-lg hover:bg-[#e9be43] disabled:opacity-50 transition-all shadow-[0_0_24px_rgba(201,162,39,0.35)] hover:shadow-[0_0_40px_rgba(201,162,39,0.55)] active:scale-[0.98]"
        >
          {loading ? 'ENTRANDO...' : 'ENTRAR'}
        </button>

        <p className="text-slate-700 text-xs font-mono mt-8 tracking-widest">
          OMNIMARKET PDV
        </p>
      </div>
    </div>
  );
}
