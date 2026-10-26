import { ENQUIRY_MARKETS, type EnquiryMarket } from "@spicycorner/shared";
import { orderedCountryDialCodes } from "./country-codes";

export type EnquiryDestinationChoice = {
  iso: string;
  name: string;
};

export type EnquiryDestination = {
  market: EnquiryMarket | "";
  /** Value stored on the enquiry. India keeps this empty and uses state and city. */
  country: string;
  label: string;
  iso: string;
};

/** Full dial-code list already used by the storefront, including India. */
export function enquiryDestinationChoices(): EnquiryDestinationChoice[] {
  return orderedCountryDialCodes().map((row) => ({ iso: row.iso, name: row.name }));
}

export function enquiryDestinationFromChoice(choice: EnquiryDestinationChoice): EnquiryDestination {
  if (choice.iso === "IN") {
    return { market: ENQUIRY_MARKETS.INDIA, country: "", label: choice.name, iso: "IN" };
  }
  return { market: ENQUIRY_MARKETS.OVERSEAS, country: choice.name, label: choice.name, iso: choice.iso };
}

export function filterEnquiryDestinations(
  query: string,
  choices: EnquiryDestinationChoice[] = enquiryDestinationChoices()
): EnquiryDestinationChoice[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return choices;
  return choices.filter(
    (row) => row.name.toLowerCase().includes(needle) || row.iso.toLowerCase() === needle
  );
}

/** Accepts `?country=` and `?destination=` values: ISO codes, UK, or a country name. */
export function resolveEnquiryDestination(raw?: string): EnquiryDestination {
  const value = raw?.trim() ?? "";
  if (!value) return { market: "", country: "", label: "", iso: "" };

  const upper = value.toUpperCase();
  if (upper === "IN" || upper === "INDIA") {
    return enquiryDestinationFromChoice({ iso: "IN", name: "India" });
  }

  const iso = upper === "UK" ? "GB" : upper;
  const choices = enquiryDestinationChoices();
  const byIso = iso.length === 2 ? choices.find((row) => row.iso === iso) : undefined;
  if (byIso) return enquiryDestinationFromChoice(byIso);

  const byName = choices.find((row) => row.name.toLowerCase() === value.toLowerCase());
  if (byName) return enquiryDestinationFromChoice(byName);

  return { market: ENQUIRY_MARKETS.OVERSEAS, country: value, label: value, iso: "" };
}

/** The lead still stores firstName and lastName. The form collects one name. */
export function splitEnquiryContactName(fullName: string): { firstName: string; lastName: string } {
  const trimmed = fullName.trim().replace(/\s+/g, " ");
  if (!trimmed) return { firstName: "", lastName: "" };
  const space = trimmed.indexOf(" ");
  if (space === -1) return { firstName: trimmed, lastName: "" };
  return { firstName: trimmed.slice(0, space), lastName: trimmed.slice(space + 1) };
}
