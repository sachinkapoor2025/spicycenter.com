/**
 * Print the spice location inventory (path + classification).
 * Usage: npx tsx apps/web/src/lib/content/geo/print-inventory.ts
 */
import { geoInventoryRows, GEO_LOCATIONS, geoCountries } from "./catalog";

const rows = geoInventoryRows();
const countries = geoCountries();

console.log(`# spice location pages\n`);
console.log(`Total location pages: ${GEO_LOCATIONS.length}`);
console.log(`Countries: ${countries.length}`);
console.log(`Admin regions: ${GEO_LOCATIONS.filter((l) => l.kind === "admin_region").length}`);
console.log(`Cities/areas: ${GEO_LOCATIONS.filter((l) => l.kind === "city").length}`);
console.log(`Indexable: ${GEO_LOCATIONS.filter((l) => l.indexable).length}`);
console.log(`noindex: ${GEO_LOCATIONS.filter((l) => !l.indexable).length}\n`);

console.log("| Location | Country | Type | Classification | Path | Indexed |");
console.log("|---|---|---|---|---|---|");
for (const row of rows) {
  console.log(
    `| ${row.location} | ${row.country} | ${row.kind} | ${row.adminKind} | ${row.path} | ${row.indexable ? "yes" : "noindex"} |`
  );
}
