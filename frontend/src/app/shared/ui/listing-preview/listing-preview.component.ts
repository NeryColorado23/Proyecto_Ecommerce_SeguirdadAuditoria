import { Component, Input, computed, signal } from '@angular/core';
import { Listing, listingBullets } from '../../models/listing.model';

@Component({
  selector: 'app-listing-preview',
  standalone: true,
  templateUrl: './listing-preview.component.html',
})
export class ListingPreviewComponent {
  private readonly listingSignal = signal<Listing | null>(null);

  @Input({ required: true })
  set listing(value: Listing) {
    this.listingSignal.set(value);
    this.activeImage.set(value.images[0] ?? null);
  }
  get listing(): Listing {
    return this.listingSignal()!;
  }

  readonly activeImage = signal<string | null>(null);
  readonly bullets = computed(() => listingBullets(this.listingSignal()!));

  selectImage(url: string): void {
    this.activeImage.set(url);
  }
}
