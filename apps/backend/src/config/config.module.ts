import { Global, Module } from '@nestjs/common';

import { SupabaseConfig } from './supabase.config';

/**
 * Módulo global de configuração.
 * Decorado com @Global() para que SupabaseConfig possa ser injetado
 * em qualquer módulo sem necessidade de re-importar.
 */
@Global()
@Module({
  providers: [SupabaseConfig],
  exports: [SupabaseConfig],
})
export class AppConfigModule {}
