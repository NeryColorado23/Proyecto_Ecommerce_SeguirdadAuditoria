import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { SupabaseService } from '../supabase/supabase.service.js';
import { AuthenticatedUser } from './current-user.js';

@Injectable()
export class SupabaseAuthGuard implements CanActivate {
  constructor(private readonly supabase: SupabaseService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractToken(request);

    if (!token) {
      throw new UnauthorizedException('Missing bearer token');
    }

    const user = await this.supabase.getUserFromToken(token);
    if (!user) {
      throw new UnauthorizedException('Invalid or expired token');
    }

    const role = await this.supabase.getUserRole(user.id);
    (request as Request & { user: AuthenticatedUser }).user = { ...user, role };
    return true;
  }

  private extractToken(request: Request): string | null {
    const header = request.headers['authorization'];
    if (!header?.startsWith('Bearer ')) {
      return null;
    }
    return header.slice('Bearer '.length);
  }
}
