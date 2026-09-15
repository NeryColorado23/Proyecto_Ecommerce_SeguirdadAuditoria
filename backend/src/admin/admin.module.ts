import { Module } from '@nestjs/common';
import { RolesGuard } from '../auth/roles.guard.js';
import { AdminController } from './admin.controller.js';

@Module({
  controllers: [AdminController],
  providers: [RolesGuard],
})
export class AdminModule {}
