import { Injectable, ConflictException } from '@nestjs/common';

import { CreateMovementDto } from './dto/create-movement.dto';
import { MovementResponseDto } from './dto/movement-response.dto';

interface FindMovementsOptions {
  productId?: string;
  type?: string;
}

@Injectable()
export class StockService {
  createMovement(dto: CreateMovementDto, operatorId: string): Promise<MovementResponseDto> {
    // TODO: buscar qty atual, calcular qtyAfter, inserir movimentação no Supabase,
    //       atualizar stock_qty no produto
    void dto;
    void operatorId;
    throw new ConflictException('Não implementado');
  }

  /**
   * Chamado internamente pelo SalesService após cada venda confirmada.
   * Gera movimentação do tipo 'venda' para cada item.
   */
  registerSaleMovements(
    saleId: string,
    items: Array<{ productId: string; qty: number }>,
    operatorId: string,
  ): Promise<void> {
    // TODO: para cada item, createMovement com type='venda'
    void saleId;
    void items;
    void operatorId;
    return Promise.resolve();
  }

  findMovements(_options: FindMovementsOptions): Promise<MovementResponseDto[]> {
    // TODO: listar do Supabase com filtros
    return Promise.resolve([]);
  }

  findLowStock(): Promise<unknown[]> {
    // TODO: SELECT products WHERE stock_qty <= stock_min
    return Promise.resolve([]);
  }

  getPosition(productId: string): Promise<{ productId: string; stockQty: number }> {
    // TODO: buscar stock_qty atual do produto no Supabase
    void productId;
    return Promise.resolve({ productId, stockQty: 0 });
  }
}
