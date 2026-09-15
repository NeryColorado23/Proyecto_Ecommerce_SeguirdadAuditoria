import { SetMetadata } from '@nestjs/common';
import { AppRole } from './current-user.js';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: AppRole[]) => SetMetadata(ROLES_KEY, roles);
