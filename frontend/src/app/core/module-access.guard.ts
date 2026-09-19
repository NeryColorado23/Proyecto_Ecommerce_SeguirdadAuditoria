import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AccessLevel, AppModuleName } from './permissions.service';
import { SupabaseService } from './supabase.service';

const RANK: Record<AccessLevel, number> = { viewer: 1, editor: 2 };

/** Igual que admin.guard.ts: consulta Supabase directamente en el guard en
 * vez de depender de un servicio con estado cacheado, para no arrancar con
 * datos aún no cargados justo cuando la ruta se activa. */
export const moduleAccessGuard = (
  appModule: AppModuleName,
  minLevel: AccessLevel = 'viewer',
): CanActivateFn => {
  return async () => {
    const supabase = inject(SupabaseService);
    const router = inject(Router);

    const { data: sessionData } = await supabase.client.auth.getSession();
    const userId = sessionData.session?.user.id;
    if (!userId) {
      return router.createUrlTree(['/login']);
    }

    const { data: profile } = await supabase.client
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single();

    if (profile?.['role'] === 'admin') {
      return true;
    }

    const { data: permission } = await supabase.client
      .from('module_permissions')
      .select('access_level')
      .eq('user_id', userId)
      .eq('module', appModule)
      .maybeSingle();

    const level = permission?.['access_level'] as AccessLevel | undefined;
    if (level && RANK[level] >= RANK[minLevel]) {
      return true;
    }

    return router.createUrlTree(['/dashboard']);
  };
};
