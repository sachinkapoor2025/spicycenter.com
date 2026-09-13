import { testimonials } from "@/lib/site";

export type GoogleReview = {
  id: string;
  authorName: string;
  rating: number;
  text: string;
  /** Display date, e.g. "Jul 13, 2026" or "2 weeks ago" */
  dateLabel: string;
  profilePhotoUrl?: string;
  /** When true, show the Google "G" badge */
  fromGoogle: boolean;
};

export type GoogleReviewsPayload = {
  source: "google" | "fallback";
  reviews: GoogleReview[];
  rating?: number;
  totalCount?: number;
  mapsUrl?: string;
};

function formatReviewDate(unixSeconds?: number, relative?: string): string {
  if (unixSeconds && Number.isFinite(unixSeconds)) {
    return new Date(unixSeconds * 1000).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      timeZone: "America/Los_Angeles",
    });
  }
  return relative?.trim() || "";
}

function fallbackReviews(): GoogleReviewsPayload {
  return {
    source: "fallback",
    mapsUrl: process.env.NEXT_PUBLIC_GOOGLE_MAPS_URL?.trim() || undefined,
    reviews: testimonials.map((t, i) => ({
      id: `site-${i}-${t.name}`,
      authorName: t.name,
      rating: t.rating,
      text: t.text,
      dateLabel: t.timeAgo,
      fromGoogle: false,
    })),
  };
}

type PlaceReview = {
  author_name?: string;
  rating?: number;
  text?: string;
  time?: number;
  relative_time_description?: string;
  profile_photo_url?: string;
};

type PlaceDetailsResponse = {
  status?: string;
  result?: {
    rating?: number;
    user_ratings_total?: number;
    url?: string;
    reviews?: PlaceReview[];
  };
  error_message?: string;
};

/**
 * Load Google Business reviews via Places Details API when
 * GOOGLE_PLACES_API_KEY + GOOGLE_PLACE_ID are set; otherwise site testimonials.
 */
export async function getGoogleReviews(): Promise<GoogleReviewsPayload> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY?.trim();
  const placeId = process.env.GOOGLE_PLACE_ID?.trim();
  const publicMapsUrl = process.env.NEXT_PUBLIC_GOOGLE_MAPS_URL?.trim();

  if (!apiKey || !placeId) {
    return fallbackReviews();
  }

  try {
    const url = new URL("https://maps.googleapis.com/maps/api/place/details/json");
    url.searchParams.set("place_id", placeId);
    url.searchParams.set("fields", "name,rating,user_ratings_total,url,reviews");
    url.searchParams.set("reviews_sort", "newest");
    url.searchParams.set("key", apiKey);

    const res = await fetch(url.toString(), {
      next: { revalidate: 21600 }, // 6 hours
    });
    if (!res.ok) {
      console.error("Google Places HTTP error", res.status);
      return fallbackReviews();
    }

    const data = (await res.json()) as PlaceDetailsResponse;
    if (data.status !== "OK" || !data.result) {
      console.error("Google Places status", data.status, data.error_message);
      return fallbackReviews();
    }

    const reviews = (data.result.reviews ?? [])
      .filter((r) => (r.text?.trim() || r.author_name) && (r.rating ?? 0) >= 1)
      .map((r, i) => ({
        id: `google-${r.time ?? i}-${r.author_name ?? "anon"}`,
        authorName: r.author_name?.trim() || "Google user",
        rating: Math.min(5, Math.max(1, Math.round(r.rating ?? 5))),
        text: r.text?.trim() || "",
        dateLabel: formatReviewDate(r.time, r.relative_time_description),
        profilePhotoUrl: r.profile_photo_url,
        fromGoogle: true,
      }));

    if (reviews.length === 0) {
      return fallbackReviews();
    }

    return {
      source: "google",
      reviews,
      rating: data.result.rating,
      totalCount: data.result.user_ratings_total,
      mapsUrl: publicMapsUrl || data.result.url,
    };
  } catch (err) {
    console.error("Google Places fetch failed", err);
    return fallbackReviews();
  }
}
