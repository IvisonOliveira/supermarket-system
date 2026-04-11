import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  ParseUUIDPipe,
  ConflictException,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

import { CashierService } from './cashier.service';
import { CloseCashierDto } from './dto/close-cashier.dto';
import { OpenCashierDto } from './dto/open-cashier.dto';

@ApiTags('cashier')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('cashier')
export class CashierController {
  constructor(private readonly cashierService: CashierService) {}

  @Post('open')
  @ApiOperation({ summary: 'Abre um novo caixa para o operador logado' })
  open(@Body() dto: OpenCashierDto, @CurrentUser() user: { id: string }) {
    return this.cashierService.open(user.id, dto.cashier_id, dto.opening_amount);
  }

  @Post('close')
  @ApiOperation({ summary: 'Fecha o caixa atual do operador logado' })
  async close(@Body() dto: CloseCashierDto, @CurrentUser() user: { id: string }) {
    const session = await this.cashierService.getCurrent(user.id);
    if (!session) {
      throw new ConflictException('Nenhum caixa aberto para fechamento.');
    }
    return this.cashierService.close(session.id as string, dto.closing_amount);
  }

  @Get('current')
  @ApiOperation({ summary: 'Retorna a sessão atual aberta do operador' })
  getCurrent(@CurrentUser() user: { id: string }) {
    return this.cashierService.getCurrent(user.id);
  }

  @Get(':id/summary')
  @ApiOperation({ summary: 'Retorna o resumo da sessão (fechamento)' })
  getSummary(@Param('id', ParseUUIDPipe) id: string) {
    return this.cashierService.getSummary(id);
  }
}
