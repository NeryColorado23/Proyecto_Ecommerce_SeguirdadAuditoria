import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { AuditLogService } from '../audit/audit-log.service.js';
import type { AuthenticatedUser } from '../auth/current-user.js';
import { Roles } from '../auth/roles.decorator.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard.js';
import { SupabaseService } from '../supabase/supabase.service.js';
import { UpdateRoleDto } from './dto/update-role.dto.js';

@UseGuards(SupabaseAuthGuard, RolesGuard)
@Roles('admin')
@Controller('admin')
export class AdminController {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly auditLog: AuditLogService,
  ) {}

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
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() { role }: UpdateRoleDto,
    @Req() request: Request & { user: AuthenticatedUser },
  ) {
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

    await this.auditLog.record({
      userId: request.user.id,
      action: 'role_change',
      entityType: 'profile',
      entityId: id,
      ipAddress: AuditLogService.extractIp(request),
      metadata: { newRole: role },
    });

    return data;
  }
}
