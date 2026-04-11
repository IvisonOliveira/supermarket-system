import {
  Injectable,
  Logger,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { SupabaseConfig } from '../../config/supabase.config';
import { SalesService } from '../sales/sales.service';

@Injectable()
export class FiscalService {
  private readonly logger = new Logger(FiscalService.name);
  private focusApiUrl: string;
  private focusApiToken: string;

  constructor(
    private readonly supabaseConfig: SupabaseConfig,
    private readonly salesService: SalesService,
    private readonly configService: ConfigService,
  ) {
    this.focusApiUrl =
      this.configService.get<string>('FOCUS_NFE_API_URL') || 'https://api.focusnfe.com.br/v2';
    this.focusApiToken = this.configService.get<string>('FOCUS_NFE_API_TOKEN') || 'TOKEN_MOCK';
  }

  private get supabase() {
    return this.supabaseConfig.serviceClient;
  }

  async emitirNFCe(saleId: string) {
    // Busca a venda e com ela os itens (que agora possuem ncm_snapshot)
    const sale = await this.salesService.findById(saleId);
    if (!sale) throw new NotFoundException('Venda não encontrada');

    // Verifica se já existe emissão
    const { data: existingDoc } = await this.supabase
      .from('fiscal_documents')
      .select('id, access_key, status')
      .eq('sale_id', saleId)
      .single();

    if (existingDoc && existingDoc.status !== 'rejected') {
      throw new ConflictException(
        `Documento fiscal associado a esta venda já possui o status: ${existingDoc.status}`,
      );
    }

    // 1. Montagem do payload fiscal
    const items = sale.items.map((item: any, index: number) => {
      // TODO: REVISAR CAMPOS TRIBUTÁRIOS COM O CONTADOR
      return {
        numero_item: index + 1,
        codigo_produto: item.product_id,
        descricao: item.product_name_snapshot,
        ncm: item.ncm_snapshot,
        cfop: '5102', // TODO: REVISAR CFOP (Venda mercado interno consumidor)
        valor_unitario_comercial: item.unit_price,
        quantidade_comercial: item.qty,
        valor_bruto: item.total, // Total após possíveis descontos/rateios
        unidade_comercial: 'UN', // TODO: recuperar do snapshot no futuro
        icms_origem: '0', // TODO: Mapear via Config ou Produto
        icms_situacao_tributaria: '102', // TODO: REVISAR Simples Nacional
      };
    });

    const payload = {
      natureza_operacao: 'Venda Presencial ao Consumidor',
      data_emissao: new Date().toISOString(),
      presenca_comprador: '1', // Operação presencial
      cnpj_emitente: '00000000000000', // TODO: REVISAR Extrair da ENV ou base
      modalidade_frete: '9', // Sem frete
      local_destino: '1', // Operação interna (mesmo estado)
      itens: items,
      formas_pagamento: [
        {
          forma_pagamento: '01', // TODO: Mapear Dinheiro/Cartão de sale.payment_method
          valor_pagamento: sale.total,
        },
      ],
    };

    // 2. Transmissão à Focus API
    let responseData: any = {};
    let isSuccess = false;
    try {
      this.logger.log(`[FOCUS NFE] Enviando NFC-e para venda ${saleId}`);
      const base64Auth = Buffer.from(this.focusApiToken + ':').toString('base64');
      const response = await fetch(`${this.focusApiUrl}/nfce?ref=${sale.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Basic ${base64Auth}`,
        },
        body: JSON.stringify(payload),
      });
      responseData = await response.json();
      isSuccess = response.ok;
    } catch (err: any) {
      responseData = { error: err.message };
    }

    // 3. Status handling
    const status =
      isSuccess && responseData.status === 'autorizado'
        ? 'authorized'
        : isSuccess
          ? 'pending'
          : 'rejected';

    if (existingDoc) {
      await this.supabase
        .from('fiscal_documents')
        .update({
          status,
          access_key: responseData.chave_nfe || null,
          protocol: responseData.protocolo || null,
          xml_url: responseData.caminho_xml_nota_fiscal || null,
          error_message: !isSuccess ? JSON.stringify(responseData) : null,
          issued_at: isSuccess ? new Date().toISOString() : null,
        })
        .eq('id', existingDoc.id);
    } else {
      await this.supabase.from('fiscal_documents').insert({
        sale_id: saleId,
        type: 'nfce',
        status,
        access_key: responseData.chave_nfe || null,
        protocol: responseData.protocolo || null,
        xml_url: responseData.caminho_xml_nota_fiscal || null,
        error_message: !isSuccess ? JSON.stringify(responseData) : null,
        issued_at: isSuccess ? new Date().toISOString() : null,
      });
    }

    if (!isSuccess) {
      throw new BadRequestException(`Erro ao emitir NFC-e: ${JSON.stringify(responseData)}`);
    }

    return { accessKey: responseData.chave_nfe, xml: responseData.caminho_xml_nota_fiscal, status };
  }

  async consultarNFCe(accessKey: string) {
    if (!accessKey) throw new BadRequestException('A chave de acesso é obrigatória');

    try {
      const base64Auth = Buffer.from(this.focusApiToken + ':').toString('base64');
      const response = await fetch(`${this.focusApiUrl}/nfce/${accessKey}`, {
        method: 'GET',
        headers: {
          Authorization: `Basic ${base64Auth}`,
        },
      });
      const data: any = await response.json();

      if (response.ok && data?.status) {
        return { status: data.status, details: data };
      }
      throw new BadRequestException('Consulta não retornou dados válidos');
    } catch (err: any) {
      throw new BadRequestException(`Falha ao consultar NFC-e: ${err.message}`);
    }
  }

  async cancelarNFCe(accessKey: string, justificativa: string) {
    const { data: doc } = await this.supabase
      .from('fiscal_documents')
      .select('id, issued_at')
      .eq('access_key', accessKey)
      .single();

    if (!doc) throw new NotFoundException('Documento fiscal não encontrado com a chave fornecida');

    if (doc.issued_at) {
      const elapsed = Date.now() - new Date(doc.issued_at as string).getTime();
      if (elapsed > 30 * 60 * 1000) {
        throw new BadRequestException(
          'Cancelamento permitido apenas até 30 minutos após a emissão',
        );
      }
    }

    let isSuccess = false;
    let responseData: any;
    try {
      this.logger.log(`[FOCUS NFE] Solicitando cancelamento para chave ${accessKey}`);
      const base64Auth = Buffer.from(this.focusApiToken + ':').toString('base64');
      const response = await fetch(`${this.focusApiUrl}/nfce/${accessKey}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Basic ${base64Auth}`,
        },
        body: JSON.stringify({ justificativa }),
      });
      responseData = await response.json();
      isSuccess = response.ok;
    } catch (err: any) {
      throw new BadRequestException(`Erro de rede no cancelamento: ${err.message}`);
    }

    if (!isSuccess) {
      throw new BadRequestException(`Falha da API ao cancelar: ${JSON.stringify(responseData)}`);
    }

    await this.supabase
      .from('fiscal_documents')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
      })
      .eq('id', doc.id);

    return { status: 'cancelled', message: 'NFC-e cancelada com sucesso' };
  }

  async findAll(from?: string, to?: string, status?: string) {
    let query = this.supabase
      .from('fiscal_documents')
      .select('*, sale:sales(total, created_at, cashier_id)')
      .order('created_at', { ascending: false });
    if (status) query = query.eq('status', status);
    if (from) query = query.gte('created_at', from);
    if (to) query = query.lte('created_at', to);

    const { data, error } = await query;
    if (error) throw new ConflictException(`Erro ao listar documentos fiscais: ${error.message}`);
    return data || [];
  }
}
