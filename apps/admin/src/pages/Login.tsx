import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';

import { Input, Button } from '../components/ui';
import { api } from '../services/api';
import { useAuthStore } from '../store/useAppStore';

const loginSchema = z.object({
  email: z.string().min(1, 'E-mail é obrigatório').email('Formato de e-mail inválido'),
  password: z.string().min(6, 'A senha deve ter no mínimo 6 caracteres'),
});

type LoginFormInputs = z.infer<typeof loginSchema>;

export default function Login() {
  const login = useAuthStore((state) => state.login);
  const navigate = useNavigate();
  const [apiError, setApiError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormInputs>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormInputs) => {
    setApiError(null);
    try {
      const response = await api.post('/auth/login', data);
      const { user, token } = response.data;
      login(user, token);
      navigate('/');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.message || 'Falha ao autenticar. Verifique suas credenciais.';
      setApiError(errorMessage);
    }
  };

  return (
    <div className="min-h-screen flex bg-[#f8f9fc]">
      {/* Painel esquerdo — identidade visual */}
      <div className="hidden lg:flex w-1/2 bg-[#1B2A5E] flex-col items-center justify-center p-12 relative overflow-hidden">
        {/* Detalhe dourado no canto superior */}
        <div className="absolute top-0 right-0 w-40 h-40 bg-[#C9A227] opacity-10 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-[#C9A227] opacity-5 rounded-full translate-y-1/2 -translate-x-1/2" />

        <div className="relative z-10 flex flex-col items-center text-center">
          <img
            src="/logos/OmniMarket-Dark-Transparent.png"
            alt="OmniMarket"
            className="w-56 mb-10 drop-shadow-2xl"
          />
          <h1 className="text-3xl font-bold text-white mb-3 leading-tight">
            Painel Administrativo
          </h1>
          <p className="text-[#C9A227] font-medium text-lg mb-2">
            Gestão inteligente do seu negócio
          </p>
          <p className="text-blue-200 text-sm max-w-xs leading-relaxed">
            Controle vendas, estoque, fiscal e relatórios em um único lugar.
          </p>

          {/* Divisor dourado */}
          <div className="w-16 h-0.5 bg-[#C9A227] mt-8 rounded-full" />
        </div>
      </div>

      {/* Painel direito — formulário */}
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        {/* Logo mobile (visível apenas em telas menores) */}
        <div className="lg:hidden mb-8">
          <img src="/logos/OmniMarket-Logo-Transparent.png" alt="OmniMarket" className="w-40" />
        </div>

        <div className="w-full max-w-md">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-[#1B2A5E]">Bem-vindo de volta</h2>
            <p className="text-slate-500 mt-1 text-sm">Acesse sua conta para continuar</p>
          </div>

          <form className="space-y-5" onSubmit={handleSubmit(onSubmit)}>
            <Input
              label="E-mail"
              type="email"
              placeholder="admin@empresa.com"
              error={errors.email?.message}
              disabled={isSubmitting}
              {...register('email')}
            />

            <Input
              label="Senha"
              type="password"
              placeholder="••••••••"
              error={errors.password?.message}
              disabled={isSubmitting}
              {...register('password')}
            />

            <Button type="submit" variant="primary" className="w-full mt-2" loading={isSubmitting}>
              Entrar no Painel
            </Button>

            {apiError && (
              <div className="p-3 mt-4 text-sm text-center text-red-700 bg-red-50 border border-red-200 rounded-lg">
                {apiError}
              </div>
            )}
          </form>

          <p className="text-center text-xs text-slate-400 mt-8">
            OmniMarket &copy; {new Date().getFullYear()} — Sistema de Gestão para Supermercados
          </p>
        </div>
      </div>
    </div>
  );
}
