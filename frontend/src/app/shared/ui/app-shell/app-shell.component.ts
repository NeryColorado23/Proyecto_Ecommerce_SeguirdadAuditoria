import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { ProfileService } from '../../../core/profile.service';
import { SupabaseService } from '../../../core/supabase.service';

const STORAGE_KEY = 'sidebar-collapsed';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './app-shell.component.html',
  styleUrl: './app-shell.component.scss',
})
export class AppShellComponent {
  protected readonly supabase = inject(SupabaseService);
  protected readonly profile = inject(ProfileService);
  private readonly router = inject(Router);

  readonly collapsed = signal(this.readStoredCollapsed());

  toggleCollapsed(): void {
    this.collapsed.update((value) => {
      const next = !value;
      this.writeStoredCollapsed(next);
      return next;
    });
  }

  async logout(): Promise<void> {
    await this.supabase.signOut();
    await this.router.navigateByUrl('/login');
  }

  private readStoredCollapsed(): boolean {
    try {
      return localStorage.getItem(STORAGE_KEY) === 'true';
    } catch {
      return false;
    }
  }

  private writeStoredCollapsed(value: boolean): void {
    try {
      localStorage.setItem(STORAGE_KEY, String(value));
    } catch {
      // Ignorar: preferencia no persistible (modo privado, storage bloqueado, etc.)
    }
  }
}
