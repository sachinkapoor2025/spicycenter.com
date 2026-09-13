/** How long a visitor stays "live" without a heartbeat (seconds). */
export const LIVE_VISITOR_TTL_SECONDS = 180;

export type LiveVisitor = {
  sessionId: string;
  lastSeen: string;
  firstSeen?: string;
  path: string;
  country?: string;
  city?: string;
  region?: string;
  regionName?: string;
  timezone?: string;
  locale?: string;
  deviceType?: string;
  browser?: string;
  os?: string;
  referrer?: string;
  name?: string;
  email?: string;
  phone?: string;
  /** Approximate map position (derived from country/city; not GPS). */
  lat: number;
  lng: number;
  secondsAgo: number;
};

export type LiveVisitorsResponse = {
  generatedAt: string;
  activeWithinSeconds: number;
  activeCount: number;
  visitors: LiveVisitor[];
  byCountry: Array<{ country: string; count: number }>;
};
