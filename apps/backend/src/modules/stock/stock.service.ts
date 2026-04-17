import { Injectable, ConflictException, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { SupabaseConfig } from '../../config/supabase.config';

import { CreateEntryDto } from './dto/create-entry.dto';
import { CreateAdjustmentDto } from './dto/create-adjustment.dto';

interface FindMovementsOptions {
  productId?: string;
  type?: string;
}

@Injectable()
export class StockService {
  private readonly logger = new Logger(StockService.name);

  constructor(private readonly supabaseConfig: SupabaseConfig) {}

  private get supabase() {
    return this.supabaseConfig.serviceClient;
  }

  /**
   * Entrada de mercadoria (soma no estoque)
   */
  async createEntry(dto: CreateEntryDto, operatorId: string) {
    if (dto.qty <= 0) {
      throw new BadRequestException('A quantidade de entrada deve ser maior que zero.');
    }

    // 1. Pega quantidade atual (qty_before)
    const { data: product, error: prodErr } = await this.supabase
      .from('products')
      .select('id, stock_qty')
      .eq('id', dto.product_id)
      .single();

    if (prodErr || !product) {
      throw new NotFoundException('Produto não encontrado.');
    }

    const qtyBefore = Number(product.stock_qty);
    const qtyAfter = qtyBefore + dto.qty;

    // 2. Insere a movimentação. O trigger `trg_sync_product_stock` fará o UPDATE em products.
    const { data: movement, error } = await this.supabase
      .from('stock_movements')
      .insert({
        product_id: dto.product_id,
        type: 'entrada',
        qty: dto.qty,
        qty_before: qtyBefore,
        qty_after: qtyAfter,
        reason: dto.nf_number ? `NF: ${dto.nf_number} | ${dto.note || ''}` : dto.note || 'Entrada manual',
        operator_id: operatorId
      })
      .select('*')
      .single();

    if (error) {
      throw new ConflictException(`Erro ao registrar entrada de estoque: ${error.message}`);
    }

    this.logger.log(`[STOCK] Entrada registrada: Produto ${dto.product_id} | Qty: ${dto.qty} | NF: ${dto.nf_number || 'Sem NF'}`);
    return movement;
  }

  /**
   * Ajuste de estoque (avaria, furto, acerto de inventário)
   * Aceita quantidades positivas ou negativas no DTO, mas insere valor absoluto no campo qty.
   */
  async createAdjustment(dto: CreateAdjustmentDto, operatorId: string) {
    if (dto.qty === 0) {
      throw new BadRequestException('A quantidade de ajuste não pode ser zero.');
    }

    const { data: product, error: prodErr } = await this.supabase
      .from('products')
      .select('id, stock_qty')
      .eq('id', dto.product_id)
      .single();

    if (prodErr || !product) {
      throw new NotFoundException('Produto não encontrado.');
    }

    const qtyBefore = Number(product.stock_qty);
    const qtyAfter = qtyBefore + dto.qty;
    const absoluteQty = Math.abs(dto.qty);

    if (qtyAfter < 0) {
      throw new ConflictException(`O ajuste resulta em estoque negativo (${qtyAfter}). Operação bloqueada.`);
    }

    const { data: movement, error } = await this.supabase
      .from('stock_movements')
      .insert({
        product_id: dto.product_id,
        type: 'ajuste',
        qty: absoluteQty,
        qty_before: qtyBefore,
        qty_after: qtyAfter,
        reason: dto.note,
        operator_id: operatorId
      })
      .select('*')
      .single();

    if (error) {
      throw new ConflictException(`Erro ao registrar ajuste de estoque: ${error.message}`);
    }

    this.logger.log(`[STOCK] Ajuste registrado: Produto ${dto.product_id} | Válido: ${dto.qty} | Razão: ${dto.note}`);
    return movement;
  }

  /**
   * Chamado internamente pelo SalesService após cada venda confirmada.
   * Gera movimentação do tipo 'venda' para cada item.
   */
  async registerSaleMovements(
    saleId: string,
    items: Array<{ productId: string; qty: number }>,
    operatorId: string,
  ): Promise<void> {
    for (const item of items) {
      const { data: product } = await this.supabase
        .from('products')
        .select('id, stock_qty')
        .eq('id', item.productId)
        .single();
        
      if (!product) continue; // Ignora se o produto não existir

      const qtyBefore = Number(product.stock_qty);
      const qtyAfter = qtyBefore - item.qty;

      if (qtyAfter < 0) {
        this.logger.warn(
          `[STOCK] Estoque insuficiente para produto ${item.productId}. Movimentação ignorada.`
        );
        continue;
      }

      await this.supabase
        .from('stock_movements')
        .insert({
          product_id: item.productId,
          type: 'venda',
          qty: item.qty, // Sempre positivo conforme Constraint
          qty_before: qtyBefore,
          qty_after: qtyAfter,
          sale_id: saleId,
          operator_id: operatorId,
          reason: `Venda via PDV: ${saleId}`
        });
    }

    this.logger.log(`[STOCK] Baixa de estoque registrada para a venda ${saleId}`);
  }

  async findMovements(options: FindMovementsOptions) {
    let query = this.supabase
      .from('stock_movements')
      .select(`
        *,
        product:products (id, name, sku, barcode),
        operator:users (id, name)
      `)
      .order('created_at', { ascending: false });

    if (options.productId) {
      query = query.eq('product_id', options.productId);
    }
    if (options.type) {
      query = query.eq('type', options.type);
    }

    // Limitando as buscas cruas globais temporariamente se não houver paginação
    query = query.limit(100);

    const { data, error } = await query;

    if (error) {
      throw new ConflictException(`Erro ao listar movimentações: ${error.message}`);
    }

    return data || [];
  }

  async getPendingAlerts() {
    const { data, error } = await this.supabase
      .from('stock_alerts')
      .select('id, current_qty, min_qty, created_at, product_id, products(name, sku, barcode)')
      .eq('acknowledged', false)
      .order('created_at', { ascending: false });

    if (error) {
      throw new ConflictException(`Erro ao listar alertas pendentes: ${error.message}`);
    }
    return data || [];
  }

  async acknowledgeAlert(alertId: string) {
    const { data: alert, error } = await this.supabase
      .from('stock_alerts')
      .update({ acknowledged: true })
      .eq('id', alertId)
      .select('id, acknowledged')
      .single();

    if (error) {
       throw new ConflictException(`Erro ao reconhecer o alerta: ${error.message}`);
    }
    if (!alert) {
       throw new NotFoundException(`Alerta não encontrado para atualização.`);
    }

    return { message: 'Alerta marcado como lido.', alert };
  }

  async findLowStock() {
    const { data, error } = await this.supabase
      .rpc('get_low_stock_products');

    if (error) {
      throw new ConflictException(`Erro ao buscar estoque baixo: ${error.message}`);
    }

    return data || [];
  }

  async getPosition(productId: string) {
    const { data: product, error: prodErr } = await this.supabase
      .from('products')
      .select('*')
      .eq('id', productId)
      .single();

    if (prodErr || !product) {
      throw new NotFoundException('Produto não encontrado');
    }

    const { data: movements } = await this.supabase
      .from('stock_movements')
      .select('id, type, qty, qty_before, qty_after, created_at, reason')
      .eq('product_id', productId)
      .order('created_at', { ascending: false })
      .limit(10);

    return {
      product,
      recentMovements: movements || []
    };
  }
}
