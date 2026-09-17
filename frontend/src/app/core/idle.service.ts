import { Injectable, NgZone, inject } from '@angular/core';
import { Router } from '@angular/router';
import { SupabaseService } from './supabase.service';

const IDLE_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutos
const ACTIVITY_EVENTS = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'] as const;

@Injectable({ providedIn: 'root' })
export class IdleService {
  private readonly ngZone = inject(NgZone);
  private readonly router = inject(Router);
  private readonly supabase = inject(SupabaseService);

  private timer: ReturnType<typeof setTimeout> | null = null;
  private readonly boundReset = () => this.resetTimer();
  private started = false;

  start(): void {
    if (this.started) {
      return;
    }
    this.started = true;

    this.ngZone.runOutsideAngular(() => {
      for (const event of ACTIVITY_EVENTS) {
        document.addEventListener(event, this.boundReset, { passive: true });
      }
      this.resetTimer();
    });
  }

  stop(): void {
    this.started = false;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    for (const event of ACTIVITY_EVENTS) {
      document.removeEventListener(event, this.boundReset);
    }
  }

  private resetTimer(): void {
    if (this.timer) {
      clearTimeout(this.timer);
    }
    this.timer = setTimeout(() => this.onTimeout(), IDLE_TIMEOUT_MS);
  }

  private onTimeout(): void {
    this.ngZone.run(async () => {
      this.stop();
      await this.supabase.signOut();
      await this.router.navigateByUrl('/login?reason=idle');
    });
  }
}
