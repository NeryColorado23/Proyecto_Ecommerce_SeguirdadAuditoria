import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { SupabaseService } from './supabase.service';

export type AppRole = 'admin' | 'user';

export interface Profile {
  id: string;
  email: string;
  fullName: string | null;
  role: AppRole;
}

@Injectable({ providedIn: 'root' })
export class ProfileService {
  private readonly supabase = inject(SupabaseService);

  readonly profile = signal<Profile | null>(null);
  readonly isAdmin = computed(() => this.profile()?.role === 'admin');

  constructor() {
    effect(() => {
      const user = this.supabase.user();
      if (!user) {
        this.profile.set(null);
        return;
      }
      void this.loadProfile(user.id);
    });
  }

  private async loadProfile(userId: string): Promise<void> {
    const { data, error } = await this.supabase.client
      .from('profiles')
      .select('id, email, full_name, role')
      .eq('id', userId)
      .single();

    if (error || !data) {
      this.profile.set(null);
      return;
    }

    this.profile.set({
      id: data['id'],
      email: data['email'],
      fullName: data['full_name'],
      role: data['role'],
    });
  }
}
