import { DatePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { environment } from '../../../environments/environment';
import { ProfileService } from '../../core/profile.service';
import { ImportBatch } from '../../shared/models/import.model';
import { ImportHistoryComponent } from '../../shared/ui/import-history/import-history.component';
import { ImportUploaderComponent } from '../../shared/ui/import-uploader/import-uploader.component';

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
  updated_at: string;
}

@Component({
  selector: 'app-listings',
  standalone: true,
  imports: [DatePipe, ImportUploaderComponent, ImportHistoryComponent],
  templateUrl: './listings.component.html',
})
export class ListingsComponent {
  private readonly http = inject(HttpClient);
  protected readonly profile = inject(ProfileService);

  readonly importUrl = `${environment.apiUrl}/listings/import`;
  readonly templateUrl = `${environment.apiUrl}/listings/template`;

  readonly listings = signal<Listing[]>([]);
  readonly batches = signal<ImportBatch[]>([]);
  readonly loading = signal(true);

  constructor() {
    this.refresh();
  }

  onImported(): void {
    this.refresh();
  }

  bulletsPreview(listing: Listing): string {
    return [
      listing.bullet_1,
      listing.bullet_2,
      listing.bullet_3,
      listing.bullet_4,
      listing.bullet_5,
    ]
      .filter(Boolean)
      .join(' • ');
  }

  private refresh(): void {
    this.loading.set(true);
    this.http.get<Listing[]>(`${environment.apiUrl}/listings`).subscribe((data) => {
      this.listings.set(data);
      this.loading.set(false);
    });
    this.http
      .get<ImportBatch[]>(`${environment.apiUrl}/listings/imports`)
      .subscribe((data) => this.batches.set(data));
  }
}
