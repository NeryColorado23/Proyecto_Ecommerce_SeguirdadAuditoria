import { Module } from '@nestjs/common';
import { RolesGuard } from '../auth/roles.guard.js';
import { ImportBatchesService } from '../imports/import-batches.service.js';
import { ListingsController } from './listings.controller.js';

@Module({
  controllers: [ListingsController],
  providers: [RolesGuard, ImportBatchesService],
})
export class ListingsModule {}
