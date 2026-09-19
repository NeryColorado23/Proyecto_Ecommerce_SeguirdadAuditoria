import { SetMetadata } from '@nestjs/common';
import { AccessLevel, AppModuleName } from '../permissions/permissions.service.js';

export const MODULE_ACCESS_KEY = 'module_access';

export interface ModuleAccessRequirement {
  appModule: AppModuleName;
  level: AccessLevel;
}

/** Exige nivel de acceso mínimo sobre un módulo. Un admin siempre pasa. */
export const RequireModule = (appModule: AppModuleName, level: AccessLevel = 'viewer') =>
  SetMetadata(MODULE_ACCESS_KEY, { appModule, level } satisfies ModuleAccessRequirement);
