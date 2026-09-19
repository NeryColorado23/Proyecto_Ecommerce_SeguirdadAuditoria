import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Request } from 'express';
import type { AuthenticatedUser } from '../auth/current-user.js';
import { Roles } from '../auth/roles.decorator.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard.js';
import { AuditLogService } from './audit-log.service.js';
import { CheckLoginLockDto } from './dto/check-login-lock.dto.js';
import { LogFailedLoginDto } from './dto/log-failed-login.dto.js';

@Controller('audit')
export class AuditController {
  constructor(private readonly auditLog: AuditLogService) {}

  @UseGuards(SupabaseAuthGuard)
  @Post('login')
  async logLogin(@Req() request: Request & { user: AuthenticatedUser }) {
    await this.auditLog.record({
      userId: request.user.id,
      action: 'login',
      ipAddress: AuditLogService.extractIp(request),
    });
    return { ok: true };
  }

  // Sin guard: un login fallido no tiene sesión válida que autenticar.
  // Throttle propio y más estricto que el global para evitar que se use
  // como vector de flood del log o de enumeración de correos.
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('failed-login')
  async logFailedLogin(@Body() { email }: LogFailedLoginDto, @Req() request: Request) {
    await this.auditLog.record({
      userId: null,
      action: 'login_failed',
      entityType: 'login_attempt',
      entityId: email,
      ipAddress: AuditLogService.extractIp(request),
    });
    return { ok: true };
  }

  // Sin guard: se consulta antes de tener sesión, para frenar el intento de
  // login en el cliente sin gastar una llamada contra Supabase Auth. Mismo
  // throttle que failed-login: es la misma superficie (correo sin sesión).
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('login-lock-status')
  async checkLoginLock(@Body() { email }: CheckLoginLockDto) {
    return this.auditLog.getLoginLockStatus(email);
  }

  @UseGuards(SupabaseAuthGuard, RolesGuard)
  @Roles('admin')
  @Get()
  list() {
    return this.auditLog.list();
  }
}
