import { Injectable, signal } from '@angular/core';
import { createClient, Session, SupabaseClient, User } from '@supabase/supabase-js';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class SupabaseService {
  readonly client: SupabaseClient = createClient(
    environment.supabaseUrl,
    environment.supabaseAnonKey,
  );

  readonly session = signal<Session | null>(null);
  readonly user = signal<User | null>(null);

  constructor() {
    this.client.auth.getSession().then(({ data }) => {
      this.session.set(data.session);
      this.user.set(data.session?.user ?? null);
    });

    this.client.auth.onAuthStateChange((_event, session) => {
      this.session.set(session);
      this.user.set(session?.user ?? null);
    });
  }

  signInWithPassword(email: string, password: string) {
    return this.client.auth.signInWithPassword({ email, password });
  }

  signUp(email: string, password: string) {
    return this.client.auth.signUp({ email, password });
  }

  signOut() {
    return this.client.auth.signOut();
  }

  signInWithGoogle() {
    return this.client.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/dashboard` },
    });
  }

  resetPasswordForEmail(email: string, redirectTo: string) {
    return this.client.auth.resetPasswordForEmail(email, { redirectTo });
  }

  enrollMfa() {
    return this.client.auth.mfa.enroll({ factorType: 'totp' });
  }

  challengeMfa(factorId: string) {
    return this.client.auth.mfa.challenge({ factorId });
  }

  verifyMfa(factorId: string, challengeId: string, code: string) {
    return this.client.auth.mfa.verify({ factorId, challengeId, code });
  }

  unenrollMfa(factorId: string) {
    return this.client.auth.mfa.unenroll({ factorId });
  }

  listMfaFactors() {
    return this.client.auth.mfa.listFactors();
  }

  getAuthenticatorAssuranceLevel() {
    return this.client.auth.mfa.getAuthenticatorAssuranceLevel();
  }
}
