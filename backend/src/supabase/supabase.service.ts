import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class SupabaseService {
  readonly client: SupabaseClient;

  constructor(config: ConfigService) {
    const url = config.getOrThrow<string>('SUPABASE_URL');
    const serviceRoleKey = config.getOrThrow<string>('SUPABASE_SERVICE_ROLE_KEY');

    this.client = createClient(url, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }

  async getUserFromToken(accessToken: string) {
    const { data, error } = await this.client.auth.getUser(accessToken);
    if (error) {
      return null;
    }
    return data.user;
  }

  async getUserRole(userId: string): Promise<'admin' | 'user'> {
    const { data } = await this.client
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single();

    return (data?.['role'] as 'admin' | 'user') ?? 'user';
  }
}
