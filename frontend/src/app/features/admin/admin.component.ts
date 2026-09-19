import { DatePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { environment } from '../../../environments/environment';
import { SupabaseService } from '../../core/supabase.service';

type AccessLevel = 'viewer' | 'editor';
type PermissionValue = 'none' | AccessLevel;

export const APP_MODULES = ['ppc', 'search_terms', 'keywords', 'listings'] as const;
export type AppModuleName = (typeof APP_MODULES)[number];

const MODULE_LABELS: Record<AppModuleName, string> = {
  ppc: 'PPC',
  search_terms: 'Search Terms',
  keywords: 'Keywords',
  listings: 'Listings',
};

interface ModulePermissionMap {
  ppc: AccessLevel | null;
  search_terms: AccessLevel | null;
  keywords: AccessLevel | null;
  listings: AccessLevel | null;
}

interface AdminUserRow {
  id: string;
  email: string;
  role: 'admin' | 'user';
  permissions: ModulePermissionMap;
}

interface AuditEntry {
  id: string;
  user_id: string | null;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  ip_address: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [DatePipe],
  templateUrl: './admin.component.html',
})
export class AdminComponent {
  private readonly http = inject(HttpClient);
  private readonly supabase = inject(SupabaseService);

  readonly modules = APP_MODULES;
  readonly moduleLabel = (appModule: AppModuleName) => MODULE_LABELS[appModule];

  readonly currentUserId = this.supabase.user()?.id;
  readonly users = signal<AdminUserRow[]>([]);
  readonly loading = signal(true);
  readonly errorMessage = signal<string | null>(null);
  readonly savingUserId = signal<string | null>(null);

  readonly auditLog = signal<AuditEntry[]>([]);
  readonly auditLoading = signal(true);

  constructor() {
    this.loadUsers();
    this.loadAuditLog();
  }

  selectRole(event: MouseEvent, user: AdminUserRow, role: 'admin' | 'user'): void {
    (event.currentTarget as HTMLElement).blur();
    this.updateRole(user, role);
  }

  emailFor(userId: string | null): string {
    if (!userId) {
      return 'desconocido';
    }
    return this.users().find((user) => user.id === userId)?.email ?? userId;
  }

  permissionValue(user: AdminUserRow, appModule: AppModuleName): PermissionValue {
    return user.permissions[appModule] ?? 'none';
  }

  onPermissionChange(user: AdminUserRow, appModule: AppModuleName, value: string): void {
    const level = value as PermissionValue;
    const permissions: Record<AppModuleName, PermissionValue> = {
      ppc: this.permissionValue(user, 'ppc'),
      search_terms: this.permissionValue(user, 'search_terms'),
      keywords: this.permissionValue(user, 'keywords'),
      listings: this.permissionValue(user, 'listings'),
      [appModule]: level,
    };

    this.savingUserId.set(user.id);
    this.http
      .patch<ModulePermissionMap>(`${environment.apiUrl}/admin/users/${user.id}/permissions`, permissions)
      .subscribe({
        next: (updated) => {
          this.users.update((rows) =>
            rows.map((row) => (row.id === user.id ? { ...row, permissions: updated } : row)),
          );
          this.savingUserId.set(null);
        },
        error: () => {
          this.errorMessage.set('No se pudieron guardar los permisos.');
          this.savingUserId.set(null);
        },
      });
  }

  private updateRole(user: AdminUserRow, role: 'admin' | 'user'): void {
    if (user.role === role) {
      return;
    }

    this.http
      .patch<{ id: string; email: string; role: 'admin' | 'user' }>(
        `${environment.apiUrl}/admin/users/${user.id}/role`,
        { role },
      )
      .subscribe({
        next: (updated) => {
          this.users.update((rows) =>
            rows.map((row) => (row.id === updated.id ? { ...row, role: updated.role } : row)),
          );
          this.loadAuditLog();
        },
        error: () => this.errorMessage.set('No se pudo actualizar el rol.'),
      });
  }

  private loadUsers(): void {
    this.loading.set(true);
    this.http.get<AdminUserRow[]>(`${environment.apiUrl}/admin/users`).subscribe({
      next: (users) => {
        this.users.set(users);
        this.loading.set(false);
      },
      error: () => {
        this.errorMessage.set('No se pudo cargar la lista de usuarios.');
        this.loading.set(false);
      },
    });
  }

  private loadAuditLog(): void {
    this.auditLoading.set(true);
    this.http.get<AuditEntry[]>(`${environment.apiUrl}/audit`).subscribe({
      next: (entries) => {
        this.auditLog.set(entries);
        this.auditLoading.set(false);
      },
      error: () => this.auditLoading.set(false),
    });
  }
}
