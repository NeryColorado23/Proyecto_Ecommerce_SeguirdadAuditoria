import { DatePipe, DecimalPipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { environment } from '../../../environments/environment';
import { ProfileService } from '../../core/profile.service';
import { ImportBatch } from '../../shared/models/import.model';
import { ImportHistoryComponent } from '../../shared/ui/import-history/import-history.component';
import { ImportUploaderComponent } from '../../shared/ui/import-uploader/import-uploader.component';

interface PpcReport {
  id: string;
  campaign_name: string;
  ad_group_name: string;
  targeting: string;
  match_type: string;
  report_date: string;
  impressions: number;
  clicks: number;
  spend: number;
  sales: number;
  orders: number;
  updated_at: string;
}

@Component({
  selector: 'app-ppc',
  standalone: true,
  imports: [DatePipe, DecimalPipe, ImportUploaderComponent, ImportHistoryComponent],
  templateUrl: './ppc.component.html',
})
export class PpcComponent {
  private readonly http = inject(HttpClient);
  protected readonly profile = inject(ProfileService);

  readonly importUrl = `${environment.apiUrl}/ppc/import`;
  readonly templateUrl = `${environment.apiUrl}/ppc/template`;

  readonly reports = signal<PpcReport[]>([]);
  readonly batches = signal<ImportBatch[]>([]);
  readonly loading = signal(true);

  constructor() {
    this.refresh();
  }

  onImported(): void {
    this.refresh();
  }

  acos(report: PpcReport): string {
    if (!report.sales) {
      return '—';
    }
    return `${((report.spend / report.sales) * 100).toFixed(1)}%`;
  }

  private refresh(): void {
    this.loading.set(true);
    this.http.get<PpcReport[]>(`${environment.apiUrl}/ppc`).subscribe((data) => {
      this.reports.set(data);
      this.loading.set(false);
    });
    this.http
      .get<ImportBatch[]>(`${environment.apiUrl}/ppc/imports`)
      .subscribe((data) => this.batches.set(data));
  }
}
