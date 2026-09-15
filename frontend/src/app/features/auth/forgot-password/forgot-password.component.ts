import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthLayoutComponent } from '../../../shared/ui/auth-layout/auth-layout.component';
import { SupabaseService } from '../../../core/supabase.service';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, AuthLayoutComponent],
  templateUrl: './forgot-password.component.html',
})
export class ForgotPasswordComponent {
  private readonly fb = inject(FormBuilder);
  private readonly supabase = inject(SupabaseService);

  readonly loading = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly sent = signal(false);

  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
  });

  async submit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.errorMessage.set(null);

    const { email } = this.form.getRawValue();
    const { error } = await this.supabase.resetPasswordForEmail(
      email,
      `${window.location.origin}/login`,
    );

    this.loading.set(false);

    if (error) {
      this.errorMessage.set(error.message);
      return;
    }

    this.sent.set(true);
  }
}
