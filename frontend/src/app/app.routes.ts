import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './core/auth.guard';
import { adminGuard } from './core/admin.guard';
import { mfaEnforcementGuard, mfaVerifyGuard } from './core/mfa.guard';

export const routes: Routes = [
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./features/auth/login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'register',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./features/auth/register/register.component').then((m) => m.RegisterComponent),
  },
  {
    path: 'forgot-password',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./features/auth/forgot-password/forgot-password.component').then(
        (m) => m.ForgotPasswordComponent,
      ),
  },
  {
    path: 'mfa-verify',
    canActivate: [mfaVerifyGuard],
    loadComponent: () =>
      import('./features/auth/mfa-verify/mfa-verify.component').then((m) => m.MfaVerifyComponent),
  },
  {
    path: 'mfa-setup',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/auth/mfa-setup/mfa-setup.component').then((m) => m.MfaSetupComponent),
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./shared/ui/app-shell/app-shell.component').then((m) => m.AppShellComponent),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      {
        path: 'dashboard',
        canActivate: [mfaEnforcementGuard],
        loadComponent: () =>
          import('./features/dashboard/dashboard.component').then((m) => m.DashboardComponent),
      },
      {
        path: 'admin',
        canActivate: [adminGuard, mfaEnforcementGuard],
        loadComponent: () =>
          import('./features/admin/admin.component').then((m) => m.AdminComponent),
      },
      {
        path: 'ppc',
        canActivate: [mfaEnforcementGuard],
        loadComponent: () => import('./features/ppc/ppc.component').then((m) => m.PpcComponent),
      },
      {
        path: 'search-terms',
        canActivate: [mfaEnforcementGuard],
        loadComponent: () =>
          import('./features/search-terms/search-terms.component').then(
            (m) => m.SearchTermsComponent,
          ),
      },
      {
        path: 'listings',
        canActivate: [mfaEnforcementGuard],
        loadComponent: () =>
          import('./features/listings/listings.component').then((m) => m.ListingsComponent),
      },
      {
        path: 'keywords',
        canActivate: [mfaEnforcementGuard],
        loadComponent: () =>
          import('./features/keywords/keywords.component').then((m) => m.KeywordsComponent),
      },
      {
        path: 'listing-builder',
        canActivate: [mfaEnforcementGuard],
        loadComponent: () =>
          import('./features/listing-builder/listing-builder.component').then(
            (m) => m.ListingBuilderComponent,
          ),
      },
    ],
  },
  { path: '**', redirectTo: 'login' },
];
