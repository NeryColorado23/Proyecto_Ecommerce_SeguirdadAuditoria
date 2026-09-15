import { HttpClient } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { environment } from '../../../environments/environment';
import { SupabaseService } from '../../core/supabase.service';

interface AdminUserRow {
  id: string;
  email: string;
  role: 'admin' | 'user';
}

@Component({
  selector: 'app-admin',
  standalone: true,
  templateUrl: './admin.component.html',
})
export class AdminComponent {
  private readonly http = inject(HttpClient);
  private readonly supabase = inject(SupabaseService);

  readonly currentUserId = this.supabase.user()?.id;
  readonly users = signal<AdminUserRow[]>([]);
  readonly loading = signal(true);
  readonly errorMessage = signal<string | null>(null);

  constructor() {
    this.loadUsers();
  }

  selectRole(event: MouseEvent, user: AdminUserRow, role: 'admin' | 'user'): void {
    (event.currentTarget as HTMLElement).blur();
    this.updateRole(user, role);
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
}
