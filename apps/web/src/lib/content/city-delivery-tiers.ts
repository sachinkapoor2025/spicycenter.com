/**
 * Secondary city metadata for optional city landing templates.
 * SpicyCorner does not use /send-rakhi-to-* routes.
 */

export type SecondaryCity = {
  slug: string;
  name: string;
  state: string;
  nearbyMetroSlug: string;
  nearbyMetroLabel: string;
};

export const secondaryCities: SecondaryCity[] = [];

export function secondaryCityIntro(slug: string, name: string, state: string): string {
  const place = `${name}, ${state}`;
  return `SpicyCorner ships Indian spices, spices, and spice packs to ${place}. Delivering in 5–7 days — confirm shipping on the product page.`;
}
