import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthLayoutComponent } from '../../../shared/ui/auth-layout/auth-layout.component';
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
  private readonly router = inject(Router);

  readonly loading = signal(false);
  readonly googleLoading = signal(false);
  readonly errorMessage = signal<string | null>(null);

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
      return;
    }

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
