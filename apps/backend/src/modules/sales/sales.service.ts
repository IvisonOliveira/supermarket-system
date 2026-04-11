import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';

import { SupabaseConfig } from '../../config/supabase.config';
import { StockService } from '../stock/stock.service';

import { CreateSaleDto } from './dto/create-sale.dto';
import { SyncSalesDto } from './dto/sync-sales.dto';

const CANCEL_WINDOW_MS = 30 * 60 * 1000;

@Injectable()
export class SalesService {
  private readonly logger = new Logger(SalesService.name);

  constructor(
    private readonly stockService: StockService,
    private readonly supabaseConfig: SupabaseConfig,
  ) {}

  private get supabase() {
    return this.supabaseConfig.serviceClient;
  }

  async create(dto: CreateSaleDto, operatorId: string): Promise<any> {
    const productIds = dto.items.map((i) => i.product_id);

    const { data: products, error: prodErr } = await this.supabase
      .from('products')
      .select('id, name, barcode, price, ncm')
      .in('id', productIds);

    if (prodErr) throw new ConflictException(`Erro ao buscar produtos: ${prodErr.message}`);

    let total = 0;
    const saleItemsData = dto.items.map((item) => {
      const product = products?.find((p) => p.id === item.product_id);
      if (!product) throw new NotFoundException(`Produto ${item.product_id} não encontrado`);

      const subtotal = item.qty * item.unit_price;
      total += subtotal;

      return {
        product_id: item.product_id,
        quantity: item.qty,
        unit_price: item.unit_price,
        product_name_snapshot: product.name,
        product_barcode_snapshot: product.barcode,
        ncm_snapshot: product.ncm || '00000000',
        subtotal
      };
    });

    const finalTotal = Math.max(0, total - dto.discount);

    const { data: sale, error: saleErr } = await this.supabase
      .from('sales')
      .insert({
        cashier_session_id: dto.cashier_session_id,
        operator_id: operatorId,
        payment_method: dto.payment_method,
        discount: dto.discount,
        change_amount: dto.change,
        total: finalTotal,
        status: 'completed',
      })
      .select()
      .single();

    if (saleErr) throw new ConflictException(`Erro ao criar venda: ${saleErr.message}`);

    const itemsToInsert = saleItemsData.map((item) => ({ ...item, sale_id: sale.id }));
    const { error: itemsErr } = await this.supabase.from('sale_items').insert(itemsToInsert);

    if (itemsErr) {
      await this.supabase.from('sales').delete().eq('id', sale.id);
      throw new ConflictException(`Erro ao inserir itens da venda: ${itemsErr.message}`);
    }

    await this.stockService.registerSaleMovements(
      sale.id as string,
      dto.items.map((i) => ({ productId: i.product_id, qty: i.qty })),
      operatorId,
    );

    return this.findById(sale.id as string);
  }

  async sync(
    dto: SyncSalesDto,
  ): Promise<{ synced: string[]; duplicates: string[]; errors: string[] }> {
    const synced: string[] = [];
    const duplicates: string[] = [];
    const errors: string[] = [];

    for (const saleDto of dto.sales) {
      try {
        const { data: existing } = await this.supabase
          .from('sales')
          .select('id')
          .eq('id', saleDto.id)
          .single();

        if (existing) {
          duplicates.push(saleDto.id);
          continue;
        }

        const productIds = saleDto.items.map((i) => i.product_id);
        const { data: products } = await this.supabase
          .from('products')
          .select('id, name, barcode, ncm')
          .in('id', productIds);

        let total = 0;
        const saleItemsData = saleDto.items.map(item => {
           const product = products?.find(p => p.id === item.product_id);
           const subtotal = item.qty * item.unit_price;
           total += subtotal;
           return {
             product_id: item.product_id,
             quantity: item.qty,
             unit_price: item.unit_price,
             product_name_snapshot: product ? product.name : 'Produto Desconhecido',
             product_barcode_snapshot: product ? product.barcode : 'SIM-CODIGO',
             ncm_snapshot: product && product.ncm ? product.ncm : '00000000',
             subtotal
           };
        });

        const finalTotal = Math.max(0, total - saleDto.discount);

        const { error: saleErr } = await this.supabase.from('sales').insert({
          id: saleDto.id,
          cashier_session_id: saleDto.cashier_session_id,
          operator_id: 'SYNC_OFFLINE',
          payment_method: saleDto.payment_method,
          discount: saleDto.discount,
          change_amount: saleDto.change,
          total: finalTotal,
          status: 'completed',
          created_at: saleDto.created_at,
        });

        if (saleErr) throw new Error(saleErr.message);

        const itemsToInsert = saleItemsData.map((item) => ({ ...item, sale_id: saleDto.id }));
        const { error: itemsErr } = await this.supabase.from('sale_items').insert(itemsToInsert);

        if (itemsErr) {
          await this.supabase.from('sales').delete().eq('id', saleDto.id);
          throw new Error(itemsErr.message);
        }

        await this.stockService.registerSaleMovements(
          saleDto.id,
          saleDto.items.map((i) => ({ productId: i.product_id, qty: i.qty })),
          'SYNC_OFFLINE',
        );

        synced.push(saleDto.id);
      } catch (err: any) {
        errors.push(`Erro na venda ${saleDto.id}: ${err.message}`);
      }
    }

    this.logger.log(
      `[SYNC] Sincronização finalizada em ${new Date().toISOString()}. Synced: ${synced.length}, Duplicates: ${duplicates.length}, Errors: ${errors.length}`,
    );

    return { synced, duplicates, errors };
  }

  async findByPeriod(from?: string, to?: string, cashierId?: string): Promise<any[]> {
    let query = this.supabase
      .from('sales')
      .select('*, items:sale_items(*)')
      .order('created_at', { ascending: false });

    if (cashierId) query = query.eq('cashier_session_id', cashierId);
    if (from) query = query.gte('created_at', from);
    if (to) query = query.lte('created_at', to);

    const { data, error } = await query;
    if (error) throw new ConflictException(`Erro ao buscar vendas: ${error.message}`);

    return data || [];
  }

  async findById(id: string): Promise<any> {
    const { data, error } = await this.supabase
      .from('sales')
      .select('*, items:sale_items(*)')
      .eq('id', id)
      .single();

    if (error || !data) {
      throw new NotFoundException(`Venda ${id} não encontrada`);
    }

    return data;
  }

  async cancel(id: string, operatorId: string): Promise<any> {
    const sale = await this.findById(id);

    if (sale.status === 'cancelled') {
      throw new BadRequestException('A venda já está cancelada');
    }

    const elapsed = Date.now() - new Date(sale.created_at as string).getTime();
    if (elapsed > CANCEL_WINDOW_MS) {
      throw new BadRequestException('Cancelamento permitido apenas até 30 minutos após a emissão');
    }

    const { error: updateErr } = await this.supabase
      .from('sales')
      .update({ status: 'cancelled' })
      .eq('id', id);

    if (updateErr) throw new BadRequestException(`Erro ao cancelar venda: ${updateErr.message}`);

    // Reverte o estoque passando quantidades negativas para descontar da baixa
    await this.stockService.registerSaleMovements(
      sale.id as string,
      (sale.items as Array<{ product_id: string; quantity: number }>).map((i) => ({
        productId: i.product_id,
        qty: -i.quantity,
      })),
      operatorId,
    );

    return this.findById(id);
  }
}
