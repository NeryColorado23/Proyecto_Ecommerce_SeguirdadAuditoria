import { DatePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { environment } from '../../../environments/environment';
import { ProfileService } from '../../core/profile.service';
import { ImportBatch } from '../../shared/models/import.model';
import { ImportHistoryComponent } from '../../shared/ui/import-history/import-history.component';
import { ImportUploaderComponent } from '../../shared/ui/import-uploader/import-uploader.component';

interface KeywordRow {
  id: string;
  asin: string;
  keyword: string;
  search_volume: number | null;
  organic_rank: number | null;
  indexed: boolean;
  updated_at: string;
}

@Component({
  selector: 'app-keywords',
  standalone: true,
  imports: [DatePipe, ImportUploaderComponent, ImportHistoryComponent],
  templateUrl: './keywords.component.html',
})
export class KeywordsComponent {
  private readonly http = inject(HttpClient);
  protected readonly profile = inject(ProfileService);

  readonly importUrl = `${environment.apiUrl}/keywords/import`;
  readonly templateUrl = `${environment.apiUrl}/keywords/template`;

  readonly rows = signal<KeywordRow[]>([]);
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
    this.http.get<KeywordRow[]>(`${environment.apiUrl}/keywords`).subscribe((data) => {
      this.rows.set(data);
      this.loading.set(false);
    });
    this.http
      .get<ImportBatch[]>(`${environment.apiUrl}/keywords/imports`)
      .subscribe((data) => this.batches.set(data));
  }
}
