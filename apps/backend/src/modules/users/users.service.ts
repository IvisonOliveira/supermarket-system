import { Injectable, NotFoundException, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { SupabaseConfig } from '../../config/supabase.config';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(private readonly supabase: SupabaseConfig) {}

  async findAll() {
    const { data, error } = await this.supabase.serviceClient
      .from('users')
      .select('*');

    if (error) {
      throw new InternalServerErrorException(error.message);
    }
    return data;
  }

  async findById(id: string) {
    const { data, error } = await this.supabase.serviceClient
      .from('users')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      throw new NotFoundException('Usuário não encontrado');
    }
    return data;
  }

  async findByEmail(email: string) {
    const { data, error } = await this.supabase.serviceClient
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (error && error.code !== 'PGRST116') {
      // Ignorar PGRST116 que é 0 rows (retornará undefined/null para validações)
      throw new InternalServerErrorException(error.message);
    }
    return data;
  }

  async create(dto: CreateUserDto) {
    const adminAuth = this.supabase.serviceClient.auth.admin;

    // 1. Cria usuário em auth.users contornando signUp padrão
    const { data: authData, error: authError } = await adminAuth.createUser({
      email: dto.email,
      password: dto.password,
      email_confirm: true,
    });

    if (authError) {
      throw new BadRequestException(authError.message);
    }

    // 2. Cria registro público consolidando o perfil
    const { data: userData, error: userError } = await this.supabase.serviceClient
      .from('users')
      .insert({
        id: authData.user.id, // Amarra com id do Auth
        email: dto.email,
        name: dto.name,
        role: dto.role,
        active: true,
      })
      .select()
      .single();

    if (userError) {
      // Rollback contornando orphan auth records
      await adminAuth.deleteUser(authData.user.id);
      throw new InternalServerErrorException(`Falha de persistência: ${userError.message}`);
    }

    return userData;
  }

  async update(id: string, dto: UpdateUserDto) {
    const { data, error } = await this.supabase.serviceClient
      .from('users')
      .update(dto)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new BadRequestException(error.message);
    }
    return data;
  }

  async deactivate(id: string) {
    // A deleção lógica garante a consistência do banco pra logs
    const { data, error } = await this.supabase.serviceClient
      .from('users')
      .update({ active: false })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new BadRequestException(error.message);
    }
    return data;
  }
}
