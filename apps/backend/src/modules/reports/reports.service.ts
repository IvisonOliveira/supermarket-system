import { Injectable, ConflictException } from '@nestjs/common';

import { SupabaseConfig } from '../../config/supabase.config';

@Injectable()
export class ReportsService {
  constructor(private readonly supabaseConfig: SupabaseConfig) {}

  private get supabase() {
    return this.supabaseConfig.serviceClient;
  }

  /**
   * Utilitário interno para converter strings em limites ISO seguros (00h a 23:59h) se necessário.
   */
  private parseDateRange(start?: string, end?: string) {
    const s = start ? new Date(start).toISOString() : new Date(0).toISOString();
    const e = end ? new Date(end).toISOString() : new Date().toISOString();
    return { start: s, end: e };
  }

  /**
   * Calcula as vendas agrupadas dia a dia baseadas num range estrito.
   */
  async vendasPorPeriodo(start?: string, end?: string) {
    const range = this.parseDateRange(start, end);

    const { data: sales, error } = await this.supabase
      .from('sales')
      .select('id, total, created_at')
      .neq('status', 'cancelled')
      .gte('created_at', range.start)
      .lte('created_at', range.end);

    if (error) throw new ConflictException(`Erro no DB: ${error.message}`);

    const groupedMap = new Map<string, { date: string; revenue: number; count: number }>();

    for (const sale of sales || []) {
      const dateKey = new Date(String(sale.created_at)).toISOString().split('T')[0];
      if (!groupedMap.has(dateKey)) {
        groupedMap.set(dateKey, { date: dateKey, revenue: 0, count: 0 });
      }
      const agg = groupedMap.get(dateKey)!;
      agg.revenue += Number(sale.total);
      agg.count += 1;
    }

    return Array.from(groupedMap.values()).sort((a, b) => a.date.localeCompare(b.date));
  }

  /**
   * Resgata a performance linear de produtos dentro da janela (Qtde x Preço cobrado no snapshot)
   */
  async produtosMaisVendidos(start?: string, end?: string, limit = 10) {
    const range = this.parseDateRange(start, end);

    // Fazemos inner join filtrando vendas válidas no range que os itens residam
    const { data: items, error } = await this.supabase
      .from('sale_items')
      .select(
        `
        product_id, name, qty, total,
        sales!inner(status, created_at)
      `,
      )
      .neq('sales.status', 'cancelled')
      .gte('sales.created_at', range.start)
      .lte('sales.created_at', range.end);

    if (error) throw new ConflictException(`Falha ao recuperar itens das vendas: ${error.message}`);

    const prodMap = new Map<
      string,
      { product_id: string; name: string; qty: number; revenue: number }
    >();

    for (const item of items || []) {
      const key = String(item.product_id);
      if (!prodMap.has(key)) {
        prodMap.set(key, { product_id: key, name: String(item.name), qty: 0, revenue: 0 });
      }
      const agg = prodMap.get(key)!;
      // Note que sale_items guarda no "total" o valor real cobrado daquele bundle (qty * (unit - discount))
      agg.qty += Number(item.qty);
      agg.revenue += Number(item.total);
    }

    const sortedList = Array.from(prodMap.values()).sort((a, b) => b.revenue - a.revenue);
    return sortedList.slice(0, Number(limit));
  }

  /**
   * O Cérebro do Curve ABC: 20% Top revenue (A), 30% Mid (B) e restantes 50% bottom (C).
   */
  async curvaABC(start?: string, end?: string) {
    const baseRank = await this.produtosMaisVendidos(start, end, 999999);

    // Passo 1: Receita total exaustiva global (100%)
    const globalTradedRevenue = baseRank.reduce((acc, p) => acc + p.revenue, 0);

    if (globalTradedRevenue === 0) return [];

    let cumulatedPercent = 0;
    const finalCurve = [];

    // Passo 2 e 3: Iterar o ranking ordenado de descida
    for (const p of baseRank) {
      if (p.revenue <= 0) continue;

      const pPercent = (p.revenue / globalTradedRevenue) * 100;
      cumulatedPercent += pPercent;

      let classification = 'C';
      if (cumulatedPercent <= 80.001) {
        classification = 'A';
      } else if (cumulatedPercent <= 95.001) {
        // Acumulou proximo de + 30% da fatia em cima dos 20%
        classification = 'B';
      }

      finalCurve.push({
        product: { id: p.product_id, name: p.name },
        qty: p.qty,
        revenue: p.revenue,
        percentage: Number(pPercent.toFixed(2)),
        cumulative: Number(cumulatedPercent.toFixed(2)),
        class: classification,
      });
    }

    return finalCurve;
  }

  /**
   * Ticket Médio Padrão do Range = TOTAL / COUNT (*)
   */
  async ticketMedio(start?: string, end?: string) {
    const range = this.parseDateRange(start, end);

    const { data: sales, error } = await this.supabase
      .from('sales')
      .select('total')
      .neq('status', 'cancelled')
      .gte('created_at', range.start)
      .lte('created_at', range.end);

    if (error) throw new ConflictException(`Erro de calculo em ticket médio: ${error.message}`);

    const count = sales?.length || 0;
    if (count === 0) return { ticket_medio: 0, count: 0, revenue: 0 };

    const revenue = sales.reduce((acc, s) => acc + Number(s.total), 0);
    const avg = revenue / count;

    return {
      ticket_medio: Number(avg.toFixed(2)),
      count,
      revenue: Number(revenue.toFixed(2)),
    };
  }

  /**
   * Report Aggregator Consolidado para um dia de movimento focado.
   */
  async resumoDiario(dateParam: string) {
    // Se mandou 2026-04-10, encapsula pro range inteiro do dia UTC
    const d = new Date(dateParam);
    const startStr = new Date(d.setUTCHours(0, 0, 0, 0)).toISOString();
    const endStr = new Date(d.setUTCHours(23, 59, 59, 999)).toISOString();

    const [ticket, topProducts, paymentDistributionData] = await Promise.all([
      this.ticketMedio(startStr, endStr),
      this.produtosMaisVendidos(startStr, endStr, 5),
      this.supabase
        .from('sales')
        .select('payment_method, total')
        .neq('status', 'cancelled')
        .gte('created_at', startStr)
        .lte('created_at', endStr),
    ]);

    // Calcular share das metodologias (Pix/Especie/Card)
    const payMap = new Map<string, { count: number; sum: number }>();
    if (paymentDistributionData.data && !paymentDistributionData.error) {
      for (const sm of paymentDistributionData.data) {
        const pm = String(sm.payment_method);
        if (!payMap.has(pm)) payMap.set(pm, { count: 0, sum: 0 });
        payMap.get(pm)!.count += 1;
        payMap.get(pm)!.sum += Number(sm.total);
      }
    }

    const payTypes = Array.from(payMap.entries())
      .map(([method, metrics]) => ({
        method,
        count: metrics.count,
        total: Number(metrics.sum.toFixed(2)),
      }))
      .sort((a, b) => b.total - a.total);

    return {
      date: startStr.split('T')[0],
      sales_total: ticket.revenue,
      sales_count: ticket.count,
      ticket_medio: ticket.ticket_medio,
      top_products: topProducts,
      payment_methods: payTypes,
    };
  }
}
