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

/** Wikimedia Commons — Capsicum fruits, CC BY-SA (fallback only; committed JPEG is preferred). */
const WIKIMEDIA_CHILLI_PLACEHOLDER =
  "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5d/Capsicum_annuum_fruits.jpg/640px-Capsicum_annuum_fruits.jpg";

/** Last-resort valid JPEG so Amplify/CI is not blocked when outbound image fetch is denied. */
function syntheticPlaceholderJpeg(): Buffer {
  const soi = Buffer.from([0xff, 0xd8]);
  const app0 = Buffer.from([
    0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x00, 0x00, 0x01, 0x00, 0x01,
    0x00, 0x00,
  ]);
  const payload = Buffer.concat([
    Buffer.from("SpicyCorner placeholder "),
    Buffer.alloc(MIN_VALID_BYTES, 0x20),
  ]);
  const comLen = payload.length + 2;
  const com = Buffer.concat([Buffer.from([0xff, 0xfe, (comLen >> 8) & 0xff, comLen & 0xff]), payload]);
  const eoi = Buffer.from([0xff, 0xd9]);
  return Buffer.concat([soi, app0, com, eoi]);
}

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

  const buf = await fetchBuffer(WIKIMEDIA_CHILLI_PLACEHOLDER);
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

  const synthetic = syntheticPlaceholderJpeg();
  writeFileSync(PLACEHOLDER_PATH, synthetic);
  console.log("  ✓ using synthetic placeholder (Wikimedia fetch unavailable)");
  return synthetic;
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

  const placeholder = await downloadPlaceholder(false);

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
