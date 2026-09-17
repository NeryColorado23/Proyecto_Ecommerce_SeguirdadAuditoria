import { IsIn } from 'class-validator';
import type { AppRole } from '../../auth/current-user.js';

export class UpdateRoleDto {
  @IsIn(['admin', 'user'])
  role!: AppRole;
}
