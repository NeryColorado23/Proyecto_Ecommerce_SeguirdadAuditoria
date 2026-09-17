import { HttpClient } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { AuditService } from '../../../core/audit.service';
import { SupabaseService } from '../../../core/supabase.service';
import { AuthLayoutComponent } from '../../../shared/ui/auth-layout/auth-layout.component';

@Component({
  selector: 'app-mfa-verify',
  standalone: true,
  imports: [ReactiveFormsModule, AuthLayoutComponent],
  templateUrl: './mfa-verify.component.html',
})
export class MfaVerifyComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly supabase = inject(SupabaseService);
  private readonly http = inject(HttpClient);
  private readonly audit = inject(AuditService);
  private readonly router = inject(Router);

  readonly loading = signal(false);
  readonly ready = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly useRecoveryCode = signal(false);

  private factorId = '';
  private challengeId = '';

  readonly form = this.fb.nonNullable.group({
    code: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]],
  });

  readonly recoveryForm = this.fb.nonNullable.group({
    code: ['', [Validators.required]],
  });

  async ngOnInit(): Promise<void> {
    const { data, error } = await this.supabase.listMfaFactors();
    const factor = data?.totp.find((f) => f.status === 'verified');

    if (error || !factor) {
      this.errorMessage.set('No se encontró un método de verificación configurado.');
      return;
    }
    this.factorId = factor.id;

    const { data: challenge, error: challengeError } = await this.supabase.challengeMfa(
      this.factorId,
    );
    if (challengeError || !challenge) {
      this.errorMessage.set('No se pudo iniciar la verificación. Intenta de nuevo.');
      return;
    }
    this.challengeId = challenge.id;
    this.ready.set(true);
  }

  toggleRecoveryMode(): void {
    this.useRecoveryCode.update((value) => !value);
    this.errorMessage.set(null);
  }

  async submit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.errorMessage.set(null);

    const { code } = this.form.getRawValue();
    const { error } = await this.supabase.verifyMfa(this.factorId, this.challengeId, code);

    this.loading.set(false);

    if (error) {
      this.errorMessage.set('Código incorrecto. Intenta de nuevo.');
      return;
    }

    this.audit.logLogin();
    await this.router.navigateByUrl('/dashboard');
  }

  submitRecoveryCode(): void {
    if (this.recoveryForm.invalid) {
      this.recoveryForm.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.errorMessage.set(null);

    const { code } = this.recoveryForm.getRawValue();
    this.http.post(`${environment.apiUrl}/mfa/recovery/consume`, { code }).subscribe({
      next: async () => {
        // Refresca la sesión para que el próximo guard vea que ya no hay
        // factores MFA activos (se borraron en el backend al usar el código).
        await this.supabase.client.auth.refreshSession();
        this.loading.set(false);
        this.audit.logLogin();
        await this.router.navigateByUrl('/dashboard');
      },
      error: () => {
        this.loading.set(false);
        this.errorMessage.set('Código de recuperación inválido o ya usado.');
      },
    });
  }

  async cancel(): Promise<void> {
    await this.supabase.signOut();
    await this.router.navigateByUrl('/login');
  }
}
