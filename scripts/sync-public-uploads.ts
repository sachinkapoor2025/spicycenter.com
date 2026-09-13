/**
 * Download catalog product images into apps/web/public/uploads for Amplify static hosting.
 *
 * Copyright-safe only — does NOT fetch Amazon product photos, WordPress media, or Wayback archives.
 * Missing or unsafe files receive a public-domain spice placeholder.
 *
 * Sources (in order):
 *  1. Already on disk (if large enough and not an Amazon-import filename)
 *  2. Committed _placeholder.jpg or Wikimedia Commons public-domain chilli
 *
 * See scripts/data/IMAGE-LICENSES.md for license details.
 *
 * Usage:
 *   npm run sync:public-uploads
 */
import { mkdirSync, writeFileSync, existsSync, readFileSync } from "fs";
import { dirname, join, basename } from "path";
import { uploadsRelativePath } from "@spicycorner/shared";

const CATALOG_PATH = join(process.cwd(), "scripts/data/spicycenter-catalog.json");
const PUBLIC_ROOT = join(process.cwd(), "apps/web/public/uploads");
const PLACEHOLDER_PATH = join(PUBLIC_ROOT, "_placeholder.jpg");

/** Files smaller than this are treated as broken 1×1 placeholders. */
const MIN_VALID_BYTES = 8000;

/**
 * WooCommerce Amazon-import filenames embed m.media-amazon.com image IDs — not licensed for reuse.
 * @see packages/shared/src/lib/image-url.ts (amazon helpers removed from sync flow)
 */
function isCopyrightRiskFilename(filename: string): boolean {
  return /^imgi_/i.test(filename);
}

/** Wikimedia Commons — Pumpkin (cropped), CC0 / public domain. */
const WIKIMEDIA_PUMPKIN_PLACEHOLDER =
  "https://upload.wikimedia.org/wikipedia/commons/thumb/4/47/Pumpkin_%28cropped%29.jpg/800px-Pumpkin_%28cropped%29.jpg";

async function fetchBuffer(url: string): Promise<Buffer | null> {
  try {
    const res = await fetch(url, { redirect: "follow" });
    if (!res.ok) return null;
    const type = res.headers.get("content-type") ?? "";
    if (!type.startsWith("image/")) return null;
    return Buffer.from(await res.arrayBuffer());
  } catch {
    return null;
  }
}

async function downloadPlaceholder(force = false): Promise<Buffer> {
  if (!force && existsSync(PLACEHOLDER_PATH)) {
    const existing = readFileSync(PLACEHOLDER_PATH);
    if (existing.length >= MIN_VALID_BYTES) return existing;
  }

  mkdirSync(dirname(PLACEHOLDER_PATH), { recursive: true });

  const buf = await fetchBuffer(WIKIMEDIA_PUMPKIN_PLACEHOLDER);
  if (buf && buf.length >= MIN_VALID_BYTES) {
    writeFileSync(PLACEHOLDER_PATH, buf);
    console.log(`  ✓ placeholder saved from Wikimedia (${Math.round(buf.length / 1024)} KB)`);
    return buf;
  }

  if (existsSync(PLACEHOLDER_PATH)) {
    const committed = readFileSync(PLACEHOLDER_PATH);
    if (committed.length >= MIN_VALID_BYTES) {
      console.log("  ✓ using committed _placeholder.jpg");
      return committed;
    }
  }

  throw new Error(
    "Could not obtain a usable placeholder — commit apps/web/public/uploads/_placeholder.jpg"
  );
}

function isSafeExistingFile(path: string): boolean {
  if (!existsSync(path)) return false;
  if (readFileSync(path).length < MIN_VALID_BYTES) return false;
  if (isCopyrightRiskFilename(basename(path))) return false;
  return true;
}

async function resolveImageBytes(
  relativePath: string,
  placeholder: Buffer
): Promise<{ buf: Buffer; source: string }> {
  const dest = join(PUBLIC_ROOT, relativePath);

  if (isSafeExistingFile(dest)) {
    return { buf: readFileSync(dest), source: "existing" };
  }

  return { buf: placeholder, source: "placeholder" };
}

async function main() {
  if (!existsSync(CATALOG_PATH)) {
    console.error(`Missing ${CATALOG_PATH}`);
    process.exit(1);
  }

  const catalog = JSON.parse(readFileSync(CATALOG_PATH, "utf-8")) as {
    products: { slug: string; images?: string[] }[];
  };

  const paths = new Set<string>();
  for (const p of catalog.products) {
    for (const img of p.images ?? []) {
      const rel = uploadsRelativePath(img);
      if (rel) paths.add(rel);
    }
  }

  console.log(`Syncing ${paths.size} product images → ${PUBLIC_ROOT}`);
  console.log("Copyright-safe mode: Amazon / WordPress / Wayback fetching disabled.\n");

  const placeholder = await downloadPlaceholder(true);

  let ok = 0;
  let failed = 0;
  const bySource: Record<string, number> = {};

  for (const rel of paths) {
    const dest = join(PUBLIC_ROOT, rel);
    mkdirSync(dirname(dest), { recursive: true });

    try {
      const result = await resolveImageBytes(rel, placeholder);

      if (result.source !== "existing") {
        writeFileSync(dest, result.buf);
      }

      bySource[result.source] = (bySource[result.source] ?? 0) + 1;
      ok++;
    } catch {
      console.warn(`  ✗ ${rel}`);
      failed++;
    }
  }

  console.log("\nDone.");
  console.log(`  OK: ${ok}, failed: ${failed}`);
  console.log("  Sources:", bySource);
  console.log("\nCommit apps/web/public/uploads/ and redeploy Amplify.");
  console.log("Replace placeholders with your own product photos when available.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
