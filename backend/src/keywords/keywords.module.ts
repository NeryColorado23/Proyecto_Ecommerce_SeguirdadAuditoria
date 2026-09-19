import { Module } from '@nestjs/common';
import { ModuleAccessGuard } from '../auth/module-access.guard.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { ImportBatchesService } from '../imports/import-batches.service.js';
import { KeywordsController } from './keywords.controller.js';

@Module({
  controllers: [KeywordsController],
  providers: [RolesGuard, ModuleAccessGuard, ImportBatchesService],
})
export class KeywordsModule {}
