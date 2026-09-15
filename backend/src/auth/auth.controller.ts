import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { AuthenticatedUser } from './current-user.js';
import { SupabaseAuthGuard } from './supabase-auth.guard.js';

@Controller('auth')
export class AuthController {
  @UseGuards(SupabaseAuthGuard)
  @Get('me')
  me(@Req() request: Request & { user: AuthenticatedUser }) {
    return { user: request.user };
  }
}
