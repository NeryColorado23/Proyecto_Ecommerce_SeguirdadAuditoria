import { Component, inject } from '@angular/core';
import { ProfileService } from '../../core/profile.service';
import { SupabaseService } from '../../core/supabase.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent {
  protected readonly supabase = inject(SupabaseService);
  protected readonly profile = inject(ProfileService);
}
