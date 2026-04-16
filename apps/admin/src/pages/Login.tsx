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

      // Extrai os dados baseado no formato esperado.
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
    <div className="min-h-screen flex items-center justify-center bg-brand-primary transition-colors p-4">
      <div className="w-full max-w-md bg-white dark:bg-gray-800 p-8 shadow-xl rounded-2xl border border-gray-100 dark:border-gray-700">
        <div className="text-center mb-8 flex flex-col items-center">
          <img src="/logo.png" alt="OmniMarket" className="max-w-[120px] mb-4" />
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white">OmniMarket Login</h2>
          <p className="text-gray-500 dark:text-gray-400 mt-2">Acesso restrito ao painel</p>
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
            <div className="p-3 mt-4 text-sm text-center text-red-700 bg-red-100 dark:bg-red-900/30 dark:text-red-400 rounded-lg">
              {apiError}
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
