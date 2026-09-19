import { CurrencyPipe, DecimalPipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { environment } from '../../../environments/environment';
import { AppModuleName, PermissionsService } from '../../core/permissions.service';
import { ProfileService } from '../../core/profile.service';
import { SupabaseService } from '../../core/supabase.service';
import { ImportBatch } from '../../shared/models/import.model';
import { Listing, isListingIncomplete } from '../../shared/models/listing.model';
import { ImportHistoryComponent } from '../../shared/ui/import-history/import-history.component';

interface SearchTermRow {
  id: string;
  asin: string;
  search_term: string;
  search_volume: number | null;
}

interface KeywordRow {
  id: string;
  asin: string;
  keyword: string;
  organic_rank: number | null;
  indexed: boolean;
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

const IMPORT_SOURCES: { module: AppModuleName; label: string; endpoint: string }[] = [
  { module: 'listings', label: 'Listings', endpoint: 'listings/imports' },
  { module: 'search_terms', label: 'Search Terms', endpoint: 'search-terms/imports' },
  { module: 'ppc', label: 'PPC', endpoint: 'ppc/imports' },
  { module: 'keywords', label: 'Keywords', endpoint: 'keywords/imports' },
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
  protected readonly permissions = inject(PermissionsService);

  readonly loading = signal(true);

  private readonly listings = signal<Listing[]>([]);
  private readonly searchTerms = signal<SearchTermRow[]>([]);
  private readonly ppcReports = signal<PpcReport[]>([]);
  private readonly keywords = signal<KeywordRow[]>([]);
  readonly recentImports = signal<ImportBatch[]>([]);

  readonly listingsCount = computed(() => this.listings().length);
  readonly incompleteListings = computed(() =>
    this.listings().filter((listing) => isListingIncomplete(listing)),
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

  readonly keywordsCount = computed(() => this.keywords().length);
  readonly keywordsNotIndexed = computed(() => this.keywords().filter((k) => !k.indexed));

  constructor() {
    // permissions.ready() y profile.profile() vienen de dos efectos async
    // independientes disparados por el mismo login: hay que esperar a que
    // ambos se resuelvan antes de decidir qué módulos puede ver este
    // usuario, si no un 403 por permiso aún no cargado deja el dashboard
    // pegado en "Cargando...".
    effect(() => {
      if (!this.permissions.ready()) {
        return;
      }
      this.refresh();
    });
  }

  private refresh(): void {
    this.loading.set(true);

    if (this.permissions.canView('listings')) {
      this.http.get<Listing[]>(`${environment.apiUrl}/listings`).subscribe({
        next: (data) => {
          this.listings.set(data);
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
    } else {
      this.loading.set(false);
    }

    if (this.permissions.canView('search_terms')) {
      this.http.get<SearchTermRow[]>(`${environment.apiUrl}/search-terms`).subscribe({
        next: (data) => this.searchTerms.set(data),
        error: () => {},
      });
    }
    if (this.permissions.canView('ppc')) {
      this.http.get<PpcReport[]>(`${environment.apiUrl}/ppc`).subscribe({
        next: (data) => this.ppcReports.set(data),
        error: () => {},
      });
    }
    if (this.permissions.canView('keywords')) {
      this.http.get<KeywordRow[]>(`${environment.apiUrl}/keywords`).subscribe({
        next: (data) => this.keywords.set(data),
        error: () => {},
      });
    }

    for (const source of IMPORT_SOURCES) {
      if (!this.permissions.canView(source.module)) {
        continue;
      }
      this.http.get<ImportBatch[]>(`${environment.apiUrl}/${source.endpoint}`).subscribe({
        next: (data) => {
          const labeled = data.map((batch) => ({ ...batch, moduleLabel: source.label }));
          const merged = [...this.recentImports(), ...labeled]
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
            .slice(0, 6);
          this.recentImports.set(merged);
        },
        error: () => {},
      });
    }
  }
}
