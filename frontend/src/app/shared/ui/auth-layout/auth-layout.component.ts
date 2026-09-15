import { Component, Input } from '@angular/core';

export interface AuthStat {
  value: string;
  label: string;
}

@Component({
  selector: 'app-auth-layout',
  standalone: true,
  templateUrl: './auth-layout.component.html',
  styleUrl: './auth-layout.component.scss',
})
export class AuthLayoutComponent {
  @Input() brandName = 'ADSCOPE';
  @Input() headline = 'Amazon PPC operations console';
  @Input() tagline =
    'Campañas, search terms, keywords y listings de todas tus cuentas. Acceso solo para el equipo.';
  @Input() stats: AuthStat[] = [
    { value: '12', label: 'Cuentas' },
    { value: '3.2k', label: 'Campañas' },
    { value: '99.9%', label: 'Uptime 30d' },
  ];
  @Input() topBarLabel = 'TEAM ACCESS';
  @Input() topBarMeta = 'v0.1 · dev';
  @Input() title = 'Sign in';
  @Input() subtitle = '';
}
