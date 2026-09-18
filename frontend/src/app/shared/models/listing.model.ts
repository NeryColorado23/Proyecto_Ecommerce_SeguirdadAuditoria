export interface Listing {
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

export function listingBullets(listing: Pick<Listing, 'bullet_1' | 'bullet_2' | 'bullet_3' | 'bullet_4' | 'bullet_5'>): string[] {
  return [listing.bullet_1, listing.bullet_2, listing.bullet_3, listing.bullet_4, listing.bullet_5].filter(
    (bullet): bullet is string => !!bullet,
  );
}

export function isListingIncomplete(listing: Listing): boolean {
  return (
    !listing.title ||
    !listing.description ||
    listing.images.length === 0 ||
    listingBullets(listing).length === 0
  );
}
