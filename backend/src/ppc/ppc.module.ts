import { Module } from '@nestjs/common';
import { RolesGuard } from '../auth/roles.guard.js';
import { ImportBatchesService } from '../imports/import-batches.service.js';
import { PpcController } from './ppc.controller.js';

@Module({
  controllers: [PpcController],
  providers: [RolesGuard, ImportBatchesService],
})
export class PpcModule {}
