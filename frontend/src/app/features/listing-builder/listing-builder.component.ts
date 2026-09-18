import { DatePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { environment } from '../../../environments/environment';
import { Listing } from '../../shared/models/listing.model';
import { ListingPreviewComponent } from '../../shared/ui/listing-preview/listing-preview.component';

const TITLE_LIMIT = 200;
const BULLET_LIMIT = 250;
const DESCRIPTION_LIMIT = 2000;

@Component({
  selector: 'app-listing-builder',
  standalone: true,
  imports: [ReactiveFormsModule, DatePipe, ListingPreviewComponent],
  templateUrl: './listing-builder.component.html',
})
export class ListingBuilderComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);

  readonly titleLimit = TITLE_LIMIT;
  readonly bulletLimit = BULLET_LIMIT;
  readonly descriptionLimit = DESCRIPTION_LIMIT;

  readonly listings = signal<Listing[]>([]);
  readonly selectedId = signal<string | null>(null);
  readonly lastUpdated = signal<string | null>(null);
  readonly imageUrls = signal<string[]>(['']);
  readonly showPreview = signal(false);

  readonly saving = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    asin: ['', [Validators.required, Validators.maxLength(20)]],
    title: ['', [Validators.maxLength(TITLE_LIMIT)]],
    bullet_1: ['', [Validators.maxLength(BULLET_LIMIT)]],
    bullet_2: ['', [Validators.maxLength(BULLET_LIMIT)]],
    bullet_3: ['', [Validators.maxLength(BULLET_LIMIT)]],
    bullet_4: ['', [Validators.maxLength(BULLET_LIMIT)]],
    bullet_5: ['', [Validators.maxLength(BULLET_LIMIT)]],
    description: ['', [Validators.maxLength(DESCRIPTION_LIMIT)]],
  });

  ngOnInit(): void {
    const pendingId = this.route.snapshot.queryParamMap.get('id');
    this.loadListings(() => {
      if (pendingId) {
        this.selectListing(pendingId);
      }
    });
  }

  onSelectChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    if (value) {
      this.selectListing(value);
    } else {
      this.newListing();
    }
  }

  selectListing(id: string): void {
    const listing = this.listings().find((l) => l.id === id);
    if (!listing) {
      this.newListing();
      return;
    }

    this.selectedId.set(listing.id);
    this.lastUpdated.set(listing.updated_at);
    this.form.reset({
      asin: listing.asin,
      title: listing.title ?? '',
      bullet_1: listing.bullet_1 ?? '',
      bullet_2: listing.bullet_2 ?? '',
      bullet_3: listing.bullet_3 ?? '',
      bullet_4: listing.bullet_4 ?? '',
      bullet_5: listing.bullet_5 ?? '',
      description: listing.description ?? '',
    });
    this.form.controls.asin.disable();
    this.imageUrls.set(listing.images.length > 0 ? [...listing.images] : ['']);
    this.errorMessage.set(null);
    this.successMessage.set(null);
  }

  newListing(): void {
    this.selectedId.set(null);
    this.lastUpdated.set(null);
    this.form.reset({
      asin: '',
      title: '',
      bullet_1: '',
      bullet_2: '',
      bullet_3: '',
      bullet_4: '',
      bullet_5: '',
      description: '',
    });
    this.form.controls.asin.enable();
    this.imageUrls.set(['']);
    this.errorMessage.set(null);
    this.successMessage.set(null);
  }

  addImageField(): void {
    this.imageUrls.update((urls) => [...urls, '']);
  }

  removeImageField(index: number): void {
    this.imageUrls.update((urls) => urls.filter((_, i) => i !== index));
  }

  updateImageField(index: number, value: string): void {
    this.imageUrls.update((urls) => urls.map((u, i) => (i === index ? value : u)));
  }

  togglePreview(): void {
    this.showPreview.update((value) => !value);
  }

  getPreviewListing(): Listing {
    const raw = this.form.getRawValue();
    return {
      id: this.selectedId() ?? 'preview',
      asin: raw.asin || 'SIN-ASIN',
      title: raw.title || null,
      bullet_1: raw.bullet_1 || null,
      bullet_2: raw.bullet_2 || null,
      bullet_3: raw.bullet_3 || null,
      bullet_4: raw.bullet_4 || null,
      bullet_5: raw.bullet_5 || null,
      description: raw.description || null,
      images: this.imageUrls()
        .map((url) => url.trim())
        .filter(Boolean),
      updated_at: this.lastUpdated() ?? new Date().toISOString(),
    };
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    const { asin, ...rest } = this.form.getRawValue();
    const images = this.imageUrls()
      .map((url) => url.trim())
      .filter(Boolean);
    const id = this.selectedId();

    if (id) {
      this.http.patch<Listing>(`${environment.apiUrl}/listings/${id}`, { ...rest, images }).subscribe({
        next: (updated) => {
          this.saving.set(false);
          this.successMessage.set('Listing actualizado.');
          this.lastUpdated.set(updated.updated_at);
          this.loadListings();
        },
        error: () => {
          this.saving.set(false);
          this.errorMessage.set('No se pudo guardar el listing.');
        },
      });
    } else {
      this.http.post<Listing>(`${environment.apiUrl}/listings`, { asin, ...rest, images }).subscribe({
        next: (created) => {
          this.saving.set(false);
          this.successMessage.set('Listing creado.');
          this.selectedId.set(created.id);
          this.lastUpdated.set(created.updated_at);
          this.form.controls.asin.disable();
          this.loadListings();
        },
        error: () => {
          this.saving.set(false);
          this.errorMessage.set('No se pudo crear el listing (¿el ASIN ya existe?).');
        },
      });
    }
  }

  private loadListings(onLoaded?: () => void): void {
    this.http.get<Listing[]>(`${environment.apiUrl}/listings`).subscribe((data) => {
      this.listings.set(data);
      onLoaded?.();
    });
  }
}
