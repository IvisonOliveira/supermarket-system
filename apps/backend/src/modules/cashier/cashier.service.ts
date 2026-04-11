import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';

import { SupabaseConfig } from '../../config/supabase.config';
import { SalesService } from '../sales/sales.service';

@Injectable()
export class CashierService {
  constructor(
    private readonly supabaseConfig: SupabaseConfig,
    private readonly salesService: SalesService,
  ) {}

  private get supabase() {
    return this.supabaseConfig.serviceClient;
  }

  async open(operatorId: string, cashierId: string, openingAmount: number) {
    const { data: existingSession } = await this.supabase
      .from('cashier_sessions')
      .select('id')
      .eq('operator_id', operatorId)
      .eq('status', 'open')
      .maybeSingle();

    if (existingSession) {
      throw new ConflictException('Operador já possui um caixa aberto.');
    }

    const { data, error } = await this.supabase
      .from('cashier_sessions')
      .insert({
        operator_id: operatorId,
        cashier_id: cashierId,
        opening_amount: openingAmount,
        status: 'open',
      })
      .select()
      .single();

    if (error) {
      throw new ConflictException(`Erro ao abrir o caixa: ${error.message}`);
    }

    return data;
  }

  async close(sessionId: string, closingAmount: number) {
    const { data: session, error: getErr } = await this.supabase
      .from('cashier_sessions')
      .select('*')
      .eq('id', sessionId)
      .single();

    if (getErr || !session) {
      throw new NotFoundException(`Sessão ${sessionId} não encontrada.`);
    }

    if (session.status === 'closed') {
      throw new ConflictException('Este caixa já está fechado.');
    }

    const sales = await this.salesService.findByPeriod(session.opened_at as string, undefined, sessionId);

    const validSales = sales.filter((s) => s.status !== 'cancelled');
    const totalSales = validSales.reduce((acc, current) => acc + current.total, 0);
    const totalTransactions = validSales.length;

    const { data: updatedSession, error: updateErr } = await this.supabase
      .from('cashier_sessions')
      .update({
        closing_amount: closingAmount,
        total_sales: totalSales,
        total_transactions: totalTransactions,
        status: 'closed',
        closed_at: new Date().toISOString(),
      })
      .eq('id', sessionId)
      .select()
      .single();

    if (updateErr) {
      throw new ConflictException(`Erro ao fechar o caixa: ${updateErr.message}`);
    }

    return updatedSession;
  }

  async getCurrent(operatorId: string) {
    const { data, error } = await this.supabase
      .from('cashier_sessions')
      .select('*')
      .eq('operator_id', operatorId)
      .eq('status', 'open')
      .maybeSingle();

    if (error) {
      throw new ConflictException(`Erro ao buscar caixa atual: ${error.message}`);
    }

    return data;
  }

  async getSummary(sessionId: string) {
    const { data: session, error: getErr } = await this.supabase
      .from('cashier_sessions')
      .select('*')
      .eq('id', sessionId)
      .single();

    if (getErr || !session) {
      throw new NotFoundException(`Sessão ${sessionId} não encontrada.`);
    }

    const closedAt = (session.closed_at as string) || new Date().toISOString();
    const sales = await this.salesService.findByPeriod(session.opened_at as string, closedAt, sessionId);
    const validSales = sales.filter((s) => s.status !== 'cancelled');

    const paymentSummary = validSales.reduce(
      (acc, sale) => {
        const pm = sale.payment_method;
        if (!acc[pm]) {
          acc[pm] = 0;
        }
        acc[pm] += sale.total;
        return acc;
      },
      {} as Record<string, number>,
    );

    return {
      session,
      payment_summary: paymentSummary,
    };
  }
}
