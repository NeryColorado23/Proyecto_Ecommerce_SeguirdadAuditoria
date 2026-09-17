import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SupabaseService } from './supabase.service';

/** Bloquea el acceso a las páginas de la app si el rol admin no tiene 2FA activo. */
export const mfaEnforcementGuard: CanActivateFn = async () => {
  const supabase = inject(SupabaseService);
  const router = inject(Router);

  const { data: sessionData } = await supabase.client.auth.getSession();
  const userId = sessionData.session?.user.id;
  if (!userId) {
    return true;
  }

  const { data: profile } = await supabase.client
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single();

  if (profile?.['role'] !== 'admin') {
    return true;
  }

  const { data: factors } = await supabase.listMfaFactors();
  const hasVerifiedTotp = factors?.totp.some((factor) => factor.status === 'verified') ?? false;

  return hasVerifiedTotp || router.createUrlTree(['/mfa-setup'], { queryParams: { required: '1' } });
};

/** Solo permite entrar a /mfa-verify si de verdad hay un reto de 2FA pendiente. */
export const mfaVerifyGuard: CanActivateFn = async () => {
  const supabase = inject(SupabaseService);
  const router = inject(Router);

  const { data: sessionData } = await supabase.client.auth.getSession();
  if (!sessionData.session) {
    return router.createUrlTree(['/login']);
  }

  const { data: aal } = await supabase.getAuthenticatorAssuranceLevel();
  if (aal && aal.nextLevel === 'aal2' && aal.currentLevel !== 'aal2') {
    return true;
  }

  return router.createUrlTree(['/dashboard']);
};
