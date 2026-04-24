import { Injectable, UnauthorizedException } from '@nestjs/common';

import { SupabaseConfig } from '../../config/supabase.config';

@Injectable()
export class AuthService {
  constructor(private readonly supabase: SupabaseConfig) {}

  async signIn(email: string, password: string) {
    const { data, error } = await this.supabase.client.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data.user || !data.session) {
      throw new UnauthorizedException('Credenciais inválidas. Verifique seu e-mail e senha.');
    }

    const { data: profile } = await this.supabase.serviceClient
      .from('users')
      .select('id, name, role, active')
      .eq('id', data.user.id)
      .single();

    if (!profile || !profile.active) {
      throw new UnauthorizedException('Usuário inativo ou não encontrado.');
    }

    return {
      user: { ...data.user, name: profile.name, role: profile.role },
      token: data.session.access_token,
      refreshToken: data.session.refresh_token,
    };
  }

  async validateToken(token: string) {
    const {
      data: { user },
      error,
    } = await this.supabase.client.auth.getUser(token);

    if (error || !user) {
      throw new UnauthorizedException('Token inválido ou expirado');
    }

    return user;
  }

  async signOut(token: string) {
    const client = this.supabase.forUser(token);
    const { error } = await client.auth.signOut();

    if (error) {
      throw new UnauthorizedException(
        'Sua sessão já estava inválida ou ocorreu uma falha ao realizar o logoff.',
      );
    }
  }
}
