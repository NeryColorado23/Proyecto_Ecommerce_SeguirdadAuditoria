import { DatePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { environment } from '../../../environments/environment';
import { ProfileService } from '../../core/profile.service';
import { ImportBatch } from '../../shared/models/import.model';
import { ImportHistoryComponent } from '../../shared/ui/import-history/import-history.component';
import { ImportUploaderComponent } from '../../shared/ui/import-uploader/import-uploader.component';
import { TableSearchComponent } from '../../shared/ui/table-search/table-search.component';

interface SearchTermRow {
  id: string;
  asin: string;
  search_term: string;
  search_volume: number | null;
  updated_at: string;
}

@Component({
  selector: 'app-search-terms',
  standalone: true,
  imports: [DatePipe, ImportUploaderComponent, ImportHistoryComponent, TableSearchComponent],
  templateUrl: './search-terms.component.html',
})
export class SearchTermsComponent {
  private readonly http = inject(HttpClient);
  protected readonly profile = inject(ProfileService);

  readonly importUrl = `${environment.apiUrl}/search-terms/import`;
  readonly templateUrl = `${environment.apiUrl}/search-terms/template`;

  readonly rows = signal<SearchTermRow[]>([]);
  readonly batches = signal<ImportBatch[]>([]);
  readonly loading = signal(true);
  readonly searchQuery = signal('');
  readonly minVolume = signal<number | null>(null);
  readonly maxVolume = signal<number | null>(null);

  readonly filteredRows = computed(() => {
    const query = this.searchQuery().trim().toLowerCase();
    const min = this.minVolume();
    const max = this.maxVolume();

    return this.rows().filter((row) => {
      const matchesQuery =
        !query ||
        row.asin.toLowerCase().includes(query) ||
        row.search_term.toLowerCase().includes(query);

      const volume = row.search_volume ?? 0;
      const matchesMin = min === null || volume >= min;
      const matchesMax = max === null || volume <= max;

      return matchesQuery && matchesMin && matchesMax;
    });
  });

  onMinVolumeChange(value: string): void {
    this.minVolume.set(value ? Number(value) : null);
  }

  onMaxVolumeChange(value: string): void {
    this.maxVolume.set(value ? Number(value) : null);
  }

  constructor() {
    this.refresh();
  }

  onImported(): void {
    this.refresh();
  }

  private refresh(): void {
    this.loading.set(true);
    this.http.get<SearchTermRow[]>(`${environment.apiUrl}/search-terms`).subscribe((data) => {
      this.rows.set(data);
      this.loading.set(false);
    });
    this.http
      .get<ImportBatch[]>(`${environment.apiUrl}/search-terms/imports`)
      .subscribe((data) => this.batches.set(data));
  }
}
