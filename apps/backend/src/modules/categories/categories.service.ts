import { Injectable, InternalServerErrorException } from '@nestjs/common';

import { SupabaseConfig } from '../../config/supabase.config';

import { CreateCategoryDto } from './dto/create-category.dto';

@Injectable()
export class CategoriesService {
  constructor(private readonly supabase: SupabaseConfig) { }

  async findAll() {
    const { data, error } = await this.supabase.serviceClient
      .from('categories')
      .select('*')
      .eq('active', true)
      .order('name');

    if (error) {
      throw new InternalServerErrorException(error.message);
    }

    return data;
  }

  async create(dto: CreateCategoryDto) {
    const { data, error } = await this.supabase.serviceClient
      .from('categories')
      .insert(dto)
      .select()
      .single();

    if (error) {
      throw new InternalServerErrorException(error.message);
    }

    return data;
  }

  async update(id: string, dto: Partial<CreateCategoryDto>) {
    const { data, error } = await this.supabase.serviceClient
      .from('categories')
      .update(dto)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new InternalServerErrorException(error.message);
    }

    return data;
  }

  async remove(id: string) {
    const { error } = await this.supabase.serviceClient
      .from('categories')
      .update({ active: false })
      .eq('id', id);

    if (error) {
      throw new InternalServerErrorException(error.message);
    }
  }
}