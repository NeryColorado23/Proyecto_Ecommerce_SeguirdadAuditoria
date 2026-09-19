import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';

export interface LoginLockStatus {
  locked: boolean;
  retryAfterSeconds: number;
}

@Injectable({ providedIn: 'root' })
export class AuditService {
  private readonly http = inject(HttpClient);

  logLogin(): void {
    this.http.post(`${environment.apiUrl}/audit/login`, {}).subscribe({ error: () => {} });
  }

  logFailedLogin(email: string): void {
    this.http
      .post(`${environment.apiUrl}/audit/failed-login`, { email })
      .subscribe({ error: () => {} });
  }

  async checkLoginLock(email: string): Promise<LoginLockStatus> {
    try {
      return await firstValueFrom(
        this.http.post<LoginLockStatus>(`${environment.apiUrl}/audit/login-lock-status`, {
          email,
        }),
      );
    } catch {
      // Si el backend no responde, no bloqueamos el login por eso: el
      // control de fuerza bruta es una capa extra, no la única.
      return { locked: false, retryAfterSeconds: 0 };
    }
  }
}
