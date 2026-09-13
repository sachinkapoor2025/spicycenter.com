/** Public carrier tracking URL for customer-facing order pages. */
export function carrierTrackingUrl(trackingNumber: string, carrier?: string): string {
  const tn = trackingNumber.trim();
  if (!tn) return "";

  const c = (carrier ?? "").toLowerCase();
  if (c.includes("ups")) {
    return `https://www.ups.com/track?tracknum=${encodeURIComponent(tn)}`;
  }
  if (c.includes("fedex") || c.includes("fed ex")) {
    return `https://www.fedex.com/fedextrack/?trknbr=${encodeURIComponent(tn)}`;
  }
  if (c.includes("dhl")) {
    return `https://www.dhl.com/us-en/home/tracking.html?tracking-id=${encodeURIComponent(tn)}`;
  }
  // Default: USPS (primary SpicyCorner carrier) + generic fallback for unknown labels.
  if (c.includes("usps") || c.includes("postal") || !c) {
    return `https://tools.usps.com/go/TrackConfirmAction?tLabels=${encodeURIComponent(tn)}`;
  }
  return `https://www.google.com/search?q=${encodeURIComponent(`${carrier} tracking ${tn}`)}`;
}
