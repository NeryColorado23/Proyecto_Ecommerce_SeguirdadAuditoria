import { Module } from '@nestjs/common';
import { MfaController } from './mfa.controller.js';
import { MfaRecoveryService } from './mfa-recovery.service.js';

@Module({
  controllers: [MfaController],
  providers: [MfaRecoveryService],
})
export class MfaModule {}
