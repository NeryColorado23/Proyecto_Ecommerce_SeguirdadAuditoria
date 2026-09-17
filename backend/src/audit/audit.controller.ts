import { Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import type { AuthenticatedUser } from '../auth/current-user.js';
import { Roles } from '../auth/roles.decorator.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard.js';
import { AuditLogService } from './audit-log.service.js';

@UseGuards(SupabaseAuthGuard)
@Controller('audit')
export class AuditController {
  constructor(private readonly auditLog: AuditLogService) {}

  @Post('login')
  async logLogin(@Req() request: Request & { user: AuthenticatedUser }) {
    await this.auditLog.record({
      userId: request.user.id,
      action: 'login',
      ipAddress: AuditLogService.extractIp(request),
    });
    return { ok: true };
  }

  @UseGuards(RolesGuard)
  @Roles('admin')
  @Get()
  list() {
    return this.auditLog.list();
  }
}
