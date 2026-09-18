import { DatePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { environment } from '../../../environments/environment';
import { ProfileService } from '../../core/profile.service';
import { ImportBatch } from '../../shared/models/import.model';
import { Listing, isListingIncomplete, listingBullets } from '../../shared/models/listing.model';
import { ImportHistoryComponent } from '../../shared/ui/import-history/import-history.component';
import { ImportUploaderComponent } from '../../shared/ui/import-uploader/import-uploader.component';
import { ListingPreviewComponent } from '../../shared/ui/listing-preview/listing-preview.component';
import { TableSearchComponent } from '../../shared/ui/table-search/table-search.component';

type CompletenessFilter = 'all' | 'complete' | 'incomplete';

@Component({
  selector: 'app-listings',
  standalone: true,
  imports: [
    DatePipe,
    RouterLink,
    ImportUploaderComponent,
    ImportHistoryComponent,
    TableSearchComponent,
    ListingPreviewComponent,
  ],
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
  readonly searchQuery = signal('');
  readonly completenessFilter = signal<CompletenessFilter>('all');
  readonly previewListing = signal<Listing | null>(null);

  readonly filteredListings = computed(() => {
    const query = this.searchQuery().trim().toLowerCase();
    const completeness = this.completenessFilter();

    return this.listings().filter((listing) => {
      const matchesQuery =
        !query ||
        listing.asin.toLowerCase().includes(query) ||
        (listing.title ?? '').toLowerCase().includes(query);

      const incomplete = isListingIncomplete(listing);
      const matchesCompleteness =
        completeness === 'all' ||
        (completeness === 'incomplete' && incomplete) ||
        (completeness === 'complete' && !incomplete);

      return matchesQuery && matchesCompleteness;
    });
  });

  constructor() {
    this.refresh();
  }

  onImported(): void {
    this.refresh();
  }

  bulletsPreview(listing: Listing): string {
    return listingBullets(listing).join(' • ');
  }

  openPreview(listing: Listing): void {
    this.previewListing.set(listing);
    (document.getElementById('listing-preview-modal') as HTMLDialogElement | null)?.showModal();
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
