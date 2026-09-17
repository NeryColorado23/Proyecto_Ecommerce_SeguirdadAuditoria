import { Global, Module } from '@nestjs/common';
import { RolesGuard } from '../auth/roles.guard.js';
import { AuditController } from './audit.controller.js';
import { AuditLogService } from './audit-log.service.js';

@Global()
@Module({
  controllers: [AuditController],
  providers: [RolesGuard, AuditLogService],
  exports: [AuditLogService],
})
export class AuditModule {}
