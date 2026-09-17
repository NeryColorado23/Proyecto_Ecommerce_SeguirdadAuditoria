import { BadRequestException, Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { AuditLogService } from '../audit/audit-log.service.js';
import type { AuthenticatedUser } from '../auth/current-user.js';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard.js';
import { ConsumeRecoveryCodeDto } from './dto/consume-recovery-code.dto.js';
import { MfaRecoveryService } from './mfa-recovery.service.js';

@UseGuards(SupabaseAuthGuard)
@Controller('mfa')
export class MfaController {
  constructor(
    private readonly recovery: MfaRecoveryService,
    private readonly auditLog: AuditLogService,
  ) {}

  @Post('recovery-codes')
  async generateCodes(@Req() request: Request & { user: AuthenticatedUser }) {
    const codes = await this.recovery.generateCodes(request.user.id);
    await this.auditLog.record({
      userId: request.user.id,
      action: 'mfa_recovery_codes_generated',
      ipAddress: AuditLogService.extractIp(request),
    });
    return { codes };
  }

  @Post('recovery/consume')
  async consumeCode(
    @Body() { code }: ConsumeRecoveryCodeDto,
    @Req() request: Request & { user: AuthenticatedUser },
  ) {
    const ok = await this.recovery.consumeCode(request.user.id, code);

    await this.auditLog.record({
      userId: request.user.id,
      action: ok ? 'mfa_recovery_used' : 'mfa_recovery_failed',
      ipAddress: AuditLogService.extractIp(request),
    });

    if (!ok) {
      throw new BadRequestException('Código de recuperación inválido o ya usado');
    }

    return { ok: true };
  }
}
