import { DatePipe, DecimalPipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { environment } from '../../../environments/environment';
import { PermissionsService } from '../../core/permissions.service';
import { ImportBatch } from '../../shared/models/import.model';
import { ImportHistoryComponent } from '../../shared/ui/import-history/import-history.component';
import { ImportUploaderComponent } from '../../shared/ui/import-uploader/import-uploader.component';
import { TableSearchComponent } from '../../shared/ui/table-search/table-search.component';

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
  imports: [DatePipe, DecimalPipe, ImportUploaderComponent, ImportHistoryComponent, TableSearchComponent],
  templateUrl: './ppc.component.html',
})
export class PpcComponent {
  private readonly http = inject(HttpClient);
  protected readonly permissions = inject(PermissionsService);

  readonly importUrl = `${environment.apiUrl}/ppc/import`;
  readonly templateUrl = `${environment.apiUrl}/ppc/template`;

  readonly reports = signal<PpcReport[]>([]);
  readonly batches = signal<ImportBatch[]>([]);
  readonly loading = signal(true);
  readonly searchQuery = signal('');
  readonly matchTypeFilter = signal('all');
  readonly dateFrom = signal<string | null>(null);
  readonly dateTo = signal<string | null>(null);

  readonly matchTypes = computed(() => [...new Set(this.reports().map((r) => r.match_type))].sort());

  readonly filteredReports = computed(() => {
    const query = this.searchQuery().trim().toLowerCase();
    const matchType = this.matchTypeFilter();
    const from = this.dateFrom();
    const to = this.dateTo();

    return this.reports().filter((report) => {
      const matchesQuery =
        !query ||
        report.campaign_name.toLowerCase().includes(query) ||
        report.ad_group_name.toLowerCase().includes(query) ||
        report.targeting.toLowerCase().includes(query);

      const matchesType = matchType === 'all' || report.match_type === matchType;
      const matchesFrom = !from || report.report_date >= from;
      const matchesTo = !to || report.report_date <= to;

      return matchesQuery && matchesType && matchesFrom && matchesTo;
    });
  });

  onDateFromChange(value: string): void {
    this.dateFrom.set(value || null);
  }

  onDateToChange(value: string): void {
    this.dateTo.set(value || null);
  }

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
