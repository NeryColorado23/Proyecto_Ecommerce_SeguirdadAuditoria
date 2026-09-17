import { Module } from '@nestjs/common';
import { RolesGuard } from '../auth/roles.guard.js';
import { ImportBatchesService } from '../imports/import-batches.service.js';
import { KeywordsController } from './keywords.controller.js';

@Module({
  controllers: [KeywordsController],
  providers: [RolesGuard, ImportBatchesService],
})
export class KeywordsModule {}
