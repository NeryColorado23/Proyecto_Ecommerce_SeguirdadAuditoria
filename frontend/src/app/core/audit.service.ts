import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { environment } from '../../environments/environment';

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
}
