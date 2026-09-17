import { CurrencyPipe, DecimalPipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { environment } from '../../../environments/environment';
import { ProfileService } from '../../core/profile.service';
import { SupabaseService } from '../../core/supabase.service';
import { ImportBatch } from '../../shared/models/import.model';
import { ImportHistoryComponent } from '../../shared/ui/import-history/import-history.component';

interface Listing {
  id: string;
  asin: string;
  title: string | null;
  bullet_1: string | null;
  bullet_2: string | null;
  bullet_3: string | null;
  bullet_4: string | null;
  bullet_5: string | null;
  description: string | null;
  images: string[];
}

interface SearchTermRow {
  id: string;
  asin: string;
  search_term: string;
  search_volume: number | null;
}

interface PpcReport {
  id: string;
  campaign_name: string;
  ad_group_name: string;
  targeting: string;
  spend: number;
  sales: number;
  clicks: number;
  impressions: number;
  orders: number;
}

const IMPORT_SOURCES: { module: string; label: string; endpoint: string }[] = [
  { module: 'listings', label: 'Listings', endpoint: 'listings/imports' },
  { module: 'search_terms', label: 'Search Terms', endpoint: 'search-terms/imports' },
  { module: 'ppc', label: 'PPC', endpoint: 'ppc/imports' },
];

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [RouterLink, ImportHistoryComponent, DecimalPipe, CurrencyPipe],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent {
  private readonly http = inject(HttpClient);
  protected readonly supabase = inject(SupabaseService);
  protected readonly profile = inject(ProfileService);

  readonly loading = signal(true);

  private readonly listings = signal<Listing[]>([]);
  private readonly searchTerms = signal<SearchTermRow[]>([]);
  private readonly ppcReports = signal<PpcReport[]>([]);
  readonly recentImports = signal<ImportBatch[]>([]);

  readonly listingsCount = computed(() => this.listings().length);
  readonly incompleteListings = computed(() =>
    this.listings().filter((listing) => this.isIncomplete(listing)),
  );

  readonly searchTermsCount = computed(() => this.searchTerms().length);
  readonly totalSearchVolume = computed(() =>
    this.searchTerms().reduce((sum, row) => sum + (row.search_volume ?? 0), 0),
  );
  readonly topSearchTerms = computed(() =>
    [...this.searchTerms()]
      .sort((a, b) => (b.search_volume ?? 0) - (a.search_volume ?? 0))
      .slice(0, 5),
  );

  readonly ppcTotals = computed(() => {
    const reports = this.ppcReports();
    return {
      spend: reports.reduce((sum, r) => sum + Number(r.spend), 0),
      sales: reports.reduce((sum, r) => sum + Number(r.sales), 0),
      clicks: reports.reduce((sum, r) => sum + r.clicks, 0),
      impressions: reports.reduce((sum, r) => sum + r.impressions, 0),
      orders: reports.reduce((sum, r) => sum + r.orders, 0),
    };
  });
  readonly ppcAcos = computed(() => {
    const { spend, sales } = this.ppcTotals();
    return sales > 0 ? `${((spend / sales) * 100).toFixed(1)}%` : '—';
  });
  readonly topPpcBySpend = computed(() =>
    [...this.ppcReports()].sort((a, b) => Number(b.spend) - Number(a.spend)).slice(0, 5),
  );

  constructor() {
    this.refresh();
  }

  isIncomplete(listing: Listing): boolean {
    const hasAnyBullet = [
      listing.bullet_1,
      listing.bullet_2,
      listing.bullet_3,
      listing.bullet_4,
      listing.bullet_5,
    ].some(Boolean);
    return !listing.title || !listing.description || listing.images.length === 0 || !hasAnyBullet;
  }

  private refresh(): void {
    this.loading.set(true);

    this.http.get<Listing[]>(`${environment.apiUrl}/listings`).subscribe((data) => {
      this.listings.set(data);
      this.loading.set(false);
    });
    this.http
      .get<SearchTermRow[]>(`${environment.apiUrl}/search-terms`)
      .subscribe((data) => this.searchTerms.set(data));
    this.http
      .get<PpcReport[]>(`${environment.apiUrl}/ppc`)
      .subscribe((data) => this.ppcReports.set(data));

    for (const source of IMPORT_SOURCES) {
      this.http.get<ImportBatch[]>(`${environment.apiUrl}/${source.endpoint}`).subscribe((data) => {
        const labeled = data.map((batch) => ({ ...batch, moduleLabel: source.label }));
        const merged = [...this.recentImports(), ...labeled]
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
          .slice(0, 6);
        this.recentImports.set(merged);
      });
    }
  }
}
