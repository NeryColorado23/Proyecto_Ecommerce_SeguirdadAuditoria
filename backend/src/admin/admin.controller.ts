import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import type { AppRole, AuthenticatedUser } from '../auth/current-user.js';
import { Roles } from '../auth/roles.decorator.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard.js';
import { SupabaseService } from '../supabase/supabase.service.js';

const VALID_ROLES: AppRole[] = ['admin', 'user'];

@UseGuards(SupabaseAuthGuard, RolesGuard)
@Roles('admin')
@Controller('admin')
export class AdminController {
  constructor(private readonly supabase: SupabaseService) {}

  @Get('users')
  async listUsers() {
    const { data, error } = await this.supabase.client
      .from('profiles')
      .select('id, email, role')
      .order('email');

    if (error) {
      throw new BadRequestException(error.message);
    }

    return data;
  }

  @Patch('users/:id/role')
  async updateRole(
    @Param('id') id: string,
    @Body('role') role: AppRole,
    @Req() request: Request & { user: AuthenticatedUser },
  ) {
    if (!VALID_ROLES.includes(role)) {
      throw new BadRequestException('Invalid role');
    }

    if (request.user.id === id) {
      throw new ForbiddenException('No puedes cambiar tu propio rol');
    }

    const { data, error } = await this.supabase.client
      .from('profiles')
      .update({ role })
      .eq('id', id)
      .select('id, email, role')
      .single();

    if (error) {
      throw new BadRequestException(error.message);
    }

    return data;
  }
}
