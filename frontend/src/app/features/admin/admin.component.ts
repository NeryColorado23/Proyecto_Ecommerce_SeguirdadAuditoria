import { DatePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { environment } from '../../../environments/environment';
import { SupabaseService } from '../../core/supabase.service';

interface AdminUserRow {
  id: string;
  email: string;
  role: 'admin' | 'user';
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

  readonly currentUserId = this.supabase.user()?.id;
  readonly users = signal<AdminUserRow[]>([]);
  readonly loading = signal(true);
  readonly errorMessage = signal<string | null>(null);

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

  private updateRole(user: AdminUserRow, role: 'admin' | 'user'): void {
    if (user.role === role) {
      return;
    }

    this.http
      .patch<AdminUserRow>(`${environment.apiUrl}/admin/users/${user.id}/role`, { role })
      .subscribe({
        next: (updated) => {
          this.users.update((rows) => rows.map((row) => (row.id === updated.id ? updated : row)));
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
