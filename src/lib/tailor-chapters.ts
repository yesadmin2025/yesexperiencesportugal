// Stubs for retired editorial-chapter helper (formerly Bókun-coupled).
// Kept so tours.$tourId.tsx compiles; itinerary now falls back to
// Viator stops / internal tour.stops.

export type EditorialChapter = {
  label: string;
  story?: string;
  optional?: boolean;
  representativeStop?: string;
};

export function toEditorialChapters(_tourId: string): EditorialChapter[] | null {
  return null;
}
