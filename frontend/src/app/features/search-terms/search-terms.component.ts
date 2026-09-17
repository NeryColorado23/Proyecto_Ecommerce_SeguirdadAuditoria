import { DatePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { environment } from '../../../environments/environment';
import { ProfileService } from '../../core/profile.service';
import { ImportBatch } from '../../shared/models/import.model';
import { ImportHistoryComponent } from '../../shared/ui/import-history/import-history.component';
import { ImportUploaderComponent } from '../../shared/ui/import-uploader/import-uploader.component';

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
  imports: [DatePipe, ImportUploaderComponent, ImportHistoryComponent],
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
