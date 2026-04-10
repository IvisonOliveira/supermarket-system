import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * Dois clientes são necessários:
 *
 * - `client`        → anon key   — usa RLS; para operações em nome do usuário autenticado
 * - `serviceClient` → service_role key — bypassa RLS; para operações do backend
 *
 * Sempre usar `serviceClient` nos Services do NestJS.
 * Nunca expor `serviceClient` fora do backend.
 */
@Injectable()
export class SupabaseConfig implements OnModuleInit {
  private readonly logger = new Logger(SupabaseConfig.name);

  private _client: SupabaseClient;
  private _serviceClient: SupabaseClient;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    const url = this.configService.getOrThrow<string>('SUPABASE_URL');
    const anonKey = this.configService.getOrThrow<string>('SUPABASE_KEY');
    const serviceKey = this.configService.getOrThrow<string>('SUPABASE_SERVICE_KEY');

    this._client = createClient(url, anonKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    this._serviceClient = createClient(url, serviceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    this.logger.log(`Supabase conectado em ${url}`);
  }

  /** Cliente anon — respeita RLS. Use somente quando operar como usuário final. */
  get client(): SupabaseClient {
    return this._client;
  }

  /**
   * Cliente service_role — bypassa RLS.
   * Use em todos os Services do NestJS para operações do backend.
   */
  get serviceClient(): SupabaseClient {
    return this._serviceClient;
  }

  /**
   * Retorna um cliente anon autenticado com o JWT do usuário da requisição.
   * Útil quando se quer aproveitar o RLS em nome do usuário logado.
   */
  forUser(accessToken: string): SupabaseClient {
    const url = this.configService.getOrThrow<string>('SUPABASE_URL');
    const anonKey = this.configService.getOrThrow<string>('SUPABASE_KEY');

    return createClient(url, anonKey, {
      global: {
        headers: { Authorization: `Bearer ${accessToken}` },
      },
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }
}
