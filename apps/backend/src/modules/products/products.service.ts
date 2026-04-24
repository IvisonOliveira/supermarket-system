import {
  Injectable,
  NotFoundException,
  ConflictException,
  InternalServerErrorException,
} from '@nestjs/common';

import { SupabaseConfig } from '../../config/supabase.config';

import { CreateProductDto } from './dto/create-product.dto';
import { ProductFilterDto } from './dto/product-filter.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { IbptService } from './services/ibpt.service';

@Injectable()
export class ProductsService {
  constructor(
    private readonly supabase: SupabaseConfig,
    private readonly ibptService: IbptService,
  ) {}

  async create(dto: CreateProductDto): Promise<any> {
    if (dto.barcode) {
      const { data: existing } = await this.supabase.serviceClient
        .from('products')
        .select('id')
        .eq('barcode', dto.barcode)
        .maybeSingle();

      if (existing) {
        throw new ConflictException(`Produto com código de barras ${dto.barcode} já existe.`);
      }
    }

    const { data, error } = await this.supabase.serviceClient
      .from('products')
      .insert(dto)
      .select()
      .single();

    if (error) {
      throw new InternalServerErrorException(error.message);
    }
    return data;
  }

  async findAll(filters: ProductFilterDto): Promise<any> {
    try {
      const { page = 1, limit = 20, category_id, name, barcode, active } = filters;
      const offset = (page - 1) * limit;

      let query = this.supabase.serviceClient
        .from('products')
        .select('*, categories(name)', { count: 'exact' });

      if (category_id) query = query.eq('category_id', category_id);
      if (name) query = query.ilike('name', `%${name}%`);
      if (barcode) query = query.eq('barcode', barcode);
      if (active !== undefined) query = query.eq('active', active);

      const { data, error, count } = await query
        .range(offset, offset + limit - 1)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('PRODUCTS FINDALL ERROR:', JSON.stringify(error, null, 2));
        throw new InternalServerErrorException(error.message);
      }

      const formattedData =
        data?.map((p: any) => {
          const { categories, ...rest } = p;
          return {
            ...rest,
            category_name: categories?.name || null,
          };
        }) || [];

      return {
        data: formattedData,
        total: count || 0,
        page,
        totalPages: count ? Math.ceil(count / limit) : 0,
      };
    } catch (err) {
      console.error('PRODUCTS FINDALL EXCEPTION:', err);
      throw err;
    }
  }

  async findById(id: string): Promise<any> {
    const { data, error } = await this.supabase.serviceClient
      .from('products')
      .select('*, categories(name)')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      throw new InternalServerErrorException(error.message);
    }

    if (!data) {
      throw new NotFoundException(`Produto ${id} não encontrado`);
    }

    if (data.ncm) {
      const taxes = await this.ibptService.getAliquotas(data.ncm as string);
      if (taxes) {
        data.ibpt = taxes;
      }
    }

    return data;
  }

  async findByBarcode(barcode: string): Promise<any> {
    const { data, error } = await this.supabase.serviceClient
      .from('products')
      .select('*, categories(name)')
      .eq('barcode', barcode)
      .maybeSingle();

    if (error) {
      throw new InternalServerErrorException(error.message);
    }

    return data || null;
  }

  async update(id: string, dto: UpdateProductDto): Promise<any> {
    await this.findById(id);

    if (dto.barcode) {
      const { data: existing } = await this.supabase.serviceClient
        .from('products')
        .select('id')
        .eq('barcode', dto.barcode)
        .neq('id', id)
        .maybeSingle();

      if (existing) {
        throw new ConflictException(`Produto com código de barras ${dto.barcode} já existe.`);
      }
    }

    const { data, error } = await this.supabase.serviceClient
      .from('products')
      .update(dto)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new InternalServerErrorException(error.message);
    }

    return data;
  }

  async remove(id: string): Promise<void> {
    await this.findById(id);
    const { error } = await this.supabase.serviceClient
      .from('products')
      .update({ active: false })
      .eq('id', id);

    if (error) {
      throw new InternalServerErrorException(error.message);
    }
  }
}
