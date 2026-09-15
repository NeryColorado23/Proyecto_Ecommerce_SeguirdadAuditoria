import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SupabaseService } from './supabase.service';

export const adminGuard: CanActivateFn = async () => {
  const supabase = inject(SupabaseService);
  const router = inject(Router);

  const { data: sessionData } = await supabase.client.auth.getSession();
  const userId = sessionData.session?.user.id;
  if (!userId) {
    return router.createUrlTree(['/login']);
  }

  const { data } = await supabase.client
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single();

  if (data?.['role'] === 'admin') {
    return true;
  }

  return router.createUrlTree(['/dashboard']);
};
