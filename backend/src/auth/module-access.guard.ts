import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { PermissionsService } from '../permissions/permissions.service.js';
import { AuthenticatedUser } from './current-user.js';
import { MODULE_ACCESS_KEY, ModuleAccessRequirement } from './module-access.decorator.js';

@Injectable()
export class ModuleAccessGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly permissions: PermissionsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requirement = this.reflector.getAllAndOverride<ModuleAccessRequirement>(MODULE_ACCESS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requirement) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request & { user: AuthenticatedUser }>();
    if (request.user.role === 'admin') {
      return true;
    }

    const allowed = await this.permissions.hasAccess(
      request.user.id,
      requirement.appModule,
      requirement.level,
    );

    if (!allowed) {
      throw new ForbiddenException('No tienes permiso para acceder a este módulo');
    }

    return true;
  }
}
