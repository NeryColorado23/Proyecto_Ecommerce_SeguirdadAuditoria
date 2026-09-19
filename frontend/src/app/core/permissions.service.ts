import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { ProfileService } from './profile.service';
import { SupabaseService } from './supabase.service';

export type AppModuleName = 'ppc' | 'search_terms' | 'keywords' | 'listings';
export type AccessLevel = 'viewer' | 'editor';
export type ModulePermissionMap = Record<AppModuleName, AccessLevel | null>;

const RANK: Record<AccessLevel, number> = { viewer: 1, editor: 2 };

function emptyMap(): ModulePermissionMap {
  return { ppc: null, search_terms: null, keywords: null, listings: null };
}

@Injectable({ providedIn: 'root' })
export class PermissionsService {
  private readonly supabase = inject(SupabaseService);
  private readonly profile = inject(ProfileService);

  readonly permissions = signal<ModulePermissionMap>(emptyMap());
  readonly loaded = signal(false);

  readonly isAdmin = computed(() => this.profile.isAdmin());

  // Ambos datos vienen de efectos async independientes disparados por el
  // mismo signal de usuario; hay que esperar los dos antes de decidir qué
  // puede ver alguien (si no, un admin cuyo perfil tarda un poco más podría
  // verse momentáneamente como "sin acceso a nada").
  readonly ready = computed(() => this.loaded() && this.profile.profile() !== null);

  constructor() {
    effect(() => {
      const user = this.supabase.user();
      if (!user) {
        this.permissions.set(emptyMap());
        this.loaded.set(false);
        return;
      }
      void this.load(user.id);
    });
  }

  /** Nivel de acceso a un módulo, ya resuelto (admin siempre 'editor'). */
  levelFor(appModule: AppModuleName): AccessLevel | null {
    if (this.isAdmin()) {
      return 'editor';
    }
    return this.permissions()[appModule];
  }

  canView(appModule: AppModuleName): boolean {
    return this.levelFor(appModule) !== null;
  }

  canEdit(appModule: AppModuleName): boolean {
    const level = this.levelFor(appModule);
    return !!level && RANK[level] >= RANK.editor;
  }

  private async load(userId: string): Promise<void> {
    const { data } = await this.supabase.client
      .from('module_permissions')
      .select('module, access_level')
      .eq('user_id', userId);

    const map = emptyMap();
    for (const row of data ?? []) {
      map[row['module'] as AppModuleName] = row['access_level'] as AccessLevel;
    }
    this.permissions.set(map);
    this.loaded.set(true);
  }
}
