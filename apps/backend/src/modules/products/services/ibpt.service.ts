import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface IbptTaxes {
  federal: number;
  estadual: number;
  municipal: number;
  fonte: string;
}

export interface IbptResponse {
  Nacional?: number;
  nacional?: number;
  AliqNac?: number;
  Estadual?: number;
  estadual?: number;
  AliqEst?: number;
  Municipal?: number;
  municipal?: number;
  AliqMun?: number;
  Fonte?: string;
  fonte?: string;
}

@Injectable()
export class IbptService {
  private readonly logger = new Logger(IbptService.name);
  private cache = new Map<string, { data: IbptTaxes; expiresAt: number }>();
  private readonly CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 horas

  constructor(private readonly configService: ConfigService) {}

  async getAliquotas(ncm: string): Promise<IbptTaxes | null> {
    if (!ncm) return null;

    const token = this.configService.get<string>('IBPT_TOKEN');
    if (!token) {
      this.logger.warn('IBPT_TOKEN não configurado. Ignorando consulta.');
      return null;
    }

    const cleanNcm = ncm.replace(/\D/g, '');
    if (!cleanNcm) return null;

    const cached = this.cache.get(cleanNcm);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.data;
    }

    try {
      const url = new URL('https://apidoni.ibpt.org.br/api/v1/produtos');
      url.searchParams.append('token', token);
      url.searchParams.append('codigo', cleanNcm);
      url.searchParams.append('cnpj', '00000000000000'); // Campo obrigatório pela API dependendo da conta
      url.searchParams.append('uf', 'SP'); // UF padrão, apenas para consulta de NCM genérico

      const response = await fetch(url.toString(), { method: 'GET' });

      if (!response.ok) {
        this.logger.warn(`Erro na API IBPT para NCM ${cleanNcm}: Status ${response.status}`);
        return null;
      }

      const data = (await response.json()) as IbptResponse;

      const taxes: IbptTaxes = {
        federal: data?.Nacional || data?.nacional || data?.AliqNac || 0,
        estadual: data?.Estadual || data?.estadual || data?.AliqEst || 0,
        municipal: data?.Municipal || data?.municipal || data?.AliqMun || 0,
        fonte: data?.Fonte || data?.fonte || 'IBPT',
      };

      this.cache.set(cleanNcm, {
        data: taxes,
        expiresAt: Date.now() + this.CACHE_TTL_MS,
      });

      return taxes;
    } catch (error) {
      const errMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Falha ao buscar tributos no IBPT para NCM ${cleanNcm}: ${errMessage}`);
      return null;
    }
  }
}
