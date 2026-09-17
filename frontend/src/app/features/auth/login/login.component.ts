import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthLayoutComponent } from '../../../shared/ui/auth-layout/auth-layout.component';
import { AuditService } from '../../../core/audit.service';
import { SupabaseService } from '../../../core/supabase.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, AuthLayoutComponent],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly supabase = inject(SupabaseService);
  private readonly audit = inject(AuditService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly loading = signal(false);
  readonly googleLoading = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly infoMessage = signal<string | null>(
    this.route.snapshot.queryParamMap.get('reason') === 'idle'
      ? 'Tu sesión se cerró por inactividad. Vuelve a iniciar sesión.'
      : null,
  );

  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  async submit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.errorMessage.set(null);

    const { email, password } = this.form.getRawValue();
    const { error } = await this.supabase.signInWithPassword(email, password);

    this.loading.set(false);

    if (error) {
      this.errorMessage.set(this.mapError(error.message));
      this.audit.logFailedLogin(email);
      return;
    }

    const { data: aal } = await this.supabase.getAuthenticatorAssuranceLevel();
    if (aal && aal.nextLevel === 'aal2' && aal.currentLevel !== 'aal2') {
      await this.router.navigateByUrl('/mfa-verify');
      return;
    }

    this.audit.logLogin();
    await this.router.navigateByUrl('/dashboard');
  }

  async continueWithGoogle(): Promise<void> {
    this.googleLoading.set(true);
    this.errorMessage.set(null);

    const { error } = await this.supabase.signInWithGoogle();

    if (error) {
      this.googleLoading.set(false);
      this.errorMessage.set(error.message);
    }
  }

  private mapError(message: string): string {
    if (message.toLowerCase().includes('invalid login credentials')) {
      return 'Correo o contraseña incorrectos.';
    }
    return message;
  }
}
