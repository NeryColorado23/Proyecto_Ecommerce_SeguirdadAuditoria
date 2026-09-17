import { HttpClient } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { SupabaseService } from '../../../core/supabase.service';
import { AuthLayoutComponent } from '../../../shared/ui/auth-layout/auth-layout.component';

interface EnrolledFactor {
  id: string;
  status: string;
}

@Component({
  selector: 'app-mfa-setup',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, AuthLayoutComponent],
  templateUrl: './mfa-setup.component.html',
})
export class MfaSetupComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly supabase = inject(SupabaseService);
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly required = this.route.snapshot.queryParamMap.get('required') === '1';

  readonly loading = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);
  readonly qrCode = signal<string | null>(null);
  readonly secret = signal<string | null>(null);
  readonly enrolledFactors = signal<EnrolledFactor[]>([]);
  readonly recoveryCodes = signal<string[] | null>(null);

  private factorId = '';

  readonly form = this.fb.nonNullable.group({
    code: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]],
  });

  async ngOnInit(): Promise<void> {
    await this.loadFactors();
  }

  async startEnrollment(): Promise<void> {
    this.errorMessage.set(null);
    const { data, error } = await this.supabase.enrollMfa();

    if (error || !data) {
      this.errorMessage.set('No se pudo iniciar la configuración. Intenta de nuevo.');
      return;
    }

    this.factorId = data.id;
    this.qrCode.set(data.totp.qr_code);
    this.secret.set(data.totp.secret);
  }

  async confirmEnrollment(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.errorMessage.set(null);

    const { data: challenge, error: challengeError } = await this.supabase.challengeMfa(
      this.factorId,
    );
    if (challengeError || !challenge) {
      this.loading.set(false);
      this.errorMessage.set('No se pudo verificar el código. Intenta de nuevo.');
      return;
    }

    const { code } = this.form.getRawValue();
    const { error } = await this.supabase.verifyMfa(this.factorId, challenge.id, code);

    if (error) {
      this.loading.set(false);
      this.errorMessage.set(
        'Código incorrecto. Verifica la hora de tu dispositivo e intenta de nuevo.',
      );
      return;
    }

    this.qrCode.set(null);
    this.secret.set(null);
    this.form.reset();
    this.successMessage.set('Verificación en dos pasos activada correctamente.');
    await this.loadFactors();
    await this.generateRecoveryCodes();
    this.loading.set(false);
  }

  async generateRecoveryCodes(): Promise<void> {
    this.http
      .post<{ codes: string[] }>(`${environment.apiUrl}/mfa/recovery-codes`, {})
      .subscribe({
        next: ({ codes }) => this.recoveryCodes.set(codes),
        error: () =>
          this.errorMessage.set('No se pudieron generar los códigos de recuperación.'),
      });
  }

  downloadRecoveryCodes(): void {
    const codes = this.recoveryCodes();
    if (!codes) {
      return;
    }
    const blob = new Blob([codes.join('\n') + '\n'], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'codigos-recuperacion-2fa.txt';
    link.click();
    URL.revokeObjectURL(url);
  }

  async acknowledgeRecoveryCodes(): Promise<void> {
    this.recoveryCodes.set(null);
    if (this.required) {
      await this.router.navigateByUrl('/dashboard');
    }
  }

  async removeFactor(factorId: string): Promise<void> {
    await this.supabase.unenrollMfa(factorId);
    await this.loadFactors();
  }

  private async loadFactors(): Promise<void> {
    const { data } = await this.supabase.listMfaFactors();
    this.enrolledFactors.set(
      (data?.totp ?? []).map((factor) => ({ id: factor.id, status: factor.status })),
    );
  }
}
