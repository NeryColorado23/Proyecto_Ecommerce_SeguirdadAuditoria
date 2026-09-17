import { Module } from '@nestjs/common';
import { RolesGuard } from '../auth/roles.guard.js';
import { ImportBatchesService } from '../imports/import-batches.service.js';
import { SearchTermsController } from './search-terms.controller.js';

@Module({
  controllers: [SearchTermsController],
  providers: [RolesGuard, ImportBatchesService],
})
export class SearchTermsModule {}
