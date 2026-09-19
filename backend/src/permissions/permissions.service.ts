import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service.js';

export const APP_MODULES = ['ppc', 'search_terms', 'keywords', 'listings'] as const;
export type AppModuleName = (typeof APP_MODULES)[number];
export type AccessLevel = 'viewer' | 'editor';
export type ModulePermissionMap = Record<AppModuleName, AccessLevel | null>;

export interface UserWithPermissions {
  id: string;
  email: string;
  role: 'admin' | 'user';
  permissions: ModulePermissionMap;
}

const RANK: Record<AccessLevel, number> = { viewer: 1, editor: 2 };

function emptyMap(): ModulePermissionMap {
  return { ppc: null, search_terms: null, keywords: null, listings: null };
}

@Injectable()
export class PermissionsService {
  constructor(private readonly supabase: SupabaseService) {}

  async getForUser(userId: string): Promise<ModulePermissionMap> {
    const { data } = await this.supabase.client
      .from('module_permissions')
      .select('module, access_level')
      .eq('user_id', userId);

    const map = emptyMap();
    for (const row of data ?? []) {
      map[row['module'] as AppModuleName] = row['access_level'] as AccessLevel;
    }
    return map;
  }

  async hasAccess(userId: string, appModule: AppModuleName, minLevel: AccessLevel): Promise<boolean> {
    const { data } = await this.supabase.client
      .from('module_permissions')
      .select('access_level')
      .eq('user_id', userId)
      .eq('module', appModule)
      .maybeSingle();

    const level = data?.['access_level'] as AccessLevel | undefined;
    return !!level && RANK[level] >= RANK[minLevel];
  }

  async getAllWithPermissions(): Promise<UserWithPermissions[]> {
    const { data: profiles, error } = await this.supabase.client
      .from('profiles')
      .select('id, email, role')
      .order('email');

    if (error || !profiles) {
      return [];
    }

    const { data: rows } = await this.supabase.client
      .from('module_permissions')
      .select('user_id, module, access_level');

    const byUser = new Map<string, ModulePermissionMap>();
    for (const row of rows ?? []) {
      const userId = row['user_id'] as string;
      const map = byUser.get(userId) ?? emptyMap();
      map[row['module'] as AppModuleName] = row['access_level'] as AccessLevel;
      byUser.set(userId, map);
    }

    return profiles.map((profile) => ({
      id: profile['id'] as string,
      email: profile['email'] as string,
      role: profile['role'] as 'admin' | 'user',
      permissions: byUser.get(profile['id'] as string) ?? emptyMap(),
    }));
  }

  async setPermissions(
    userId: string,
    permissions: Record<AppModuleName, AccessLevel | 'none'>,
  ): Promise<ModulePermissionMap> {
    for (const appModule of APP_MODULES) {
      const level = permissions[appModule];
      if (level === 'none') {
        await this.supabase.client
          .from('module_permissions')
          .delete()
          .eq('user_id', userId)
          .eq('module', appModule);
      } else {
        await this.supabase.client.from('module_permissions').upsert(
          {
            user_id: userId,
            module: appModule,
            access_level: level,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id,module' },
        );
      }
    }

    return this.getForUser(userId);
  }
}
