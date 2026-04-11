import { Injectable, Logger } from '@nestjs/common';
import * as Papa from 'papaparse';

import { ProductsService } from '../products.service';

export interface ImportReport {
  total: number;
  imported: number;
  skipped: number;
  errors: { line: number; reason: string }[];
}

@Injectable()
export class CsvImportService {
  private readonly logger = new Logger(CsvImportService.name);

  constructor(private readonly productsService: ProductsService) {}

  async importFromCsv(buffer: Buffer): Promise<ImportReport> {
    const csvData = buffer.toString('utf-8');

    const parsed = Papa.parse(csvData, {
      header: true,
      skipEmptyLines: true,
    });

    const report: ImportReport = {
      total: parsed.data.length,
      imported: 0,
      skipped: 0,
      errors: [],
    };

    let lineNumber = 1; // Cabeçalho é contado como 1

    for (const row of parsed.data as Record<string, string>[]) {
      lineNumber++;

      try {
        const nome = row['nome']?.trim();
        const precoStr = row['preco']?.replace(',', '.');
        const preco = precoStr ? parseFloat(precoStr) : 0;

        const custoStr = row['custo']?.replace(',', '.');
        const custo = custoStr ? parseFloat(custoStr) : 0;

        const estoqueStr = row['estoque_inicial'];
        const estoque = estoqueStr ? parseInt(estoqueStr, 10) : 0;

        const ncm = row['ncm']?.trim();
        const codigo_barras = row['codigo_barras']?.trim();
        // A categoria precisaria do id uuid, se viesse o nome teríamos que fazer lookup
        // Pelo requisito enviamos diretamente se formos lidar com categorização posterior

        if (!nome) {
          throw new Error('O nome do produto é obrigatório.');
        }

        if (isNaN(preco) || preco <= 0) {
          throw new Error('O preço deve ser maior que zero.');
        }

        await this.productsService.create({
          name: nome,
          barcode: codigo_barras || undefined,
          price: preco,
          cost: isNaN(custo) ? 0 : custo,
          stock_qty: isNaN(estoque) ? 0 : estoque,
          stock_min: 0,
          unit: 'un',
          ncm: ncm || undefined,
        });

        report.imported++;
      } catch (error) {
        const errMessage = error instanceof Error ? error.message : String(error);
        this.logger.warn(`Erro importando linha ${lineNumber}: ${errMessage}`);
        report.skipped++;
        report.errors.push({
          line: lineNumber,
          reason: errMessage.includes('já existe') ? 'Código de barras já cadastrado' : errMessage,
        });
      }
    }

    return report;
  }
}
