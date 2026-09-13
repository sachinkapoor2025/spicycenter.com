/**
 * Patch description + seoDescription for TFPRD single/set rakhis so copy
 * matches product images (quantity, roli/chawal, accessories).
 *
 * Dry-run (default):
 *   npx tsx scripts/patch-tfprd-image-content.ts
 *
 * Apply to DynamoDB:
 *   ENVIRONMENT=prod npx tsx scripts/patch-tfprd-image-content.ts --db
 */
import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { metaDescription, productKeys } from "@spicycorner/shared";

type Spec = {
  slug: string;
  sku: string;
  includes: string[];
  hasRoliChawal: boolean;
  rakhiCount: number;
  designSummary: string;
};

const AUDIT_DIR = join(process.cwd(), "scripts/data/_image-content-audit");
const SPECS_PATH = join(process.cwd(), "scripts/data/tfprd-image-content-updates.json");
const OUT_PATH = join(process.cwd(), "scripts/data/tfprd-image-content-descriptions.json");

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function qtyPhrase(count: number): string {
  if (count === 1) return "a single designer Rakhi";
  return `a set of ${count} designer Rakhis`;
}

function buildDescription(name: string, spec: Spec): string {
  const includeLis = spec.includes.map((line) => `<li>${esc(line)}</li>`).join("");
  const ritualNote = spec.hasRoliChawal
    ? " Complimentary roli and chawal are included for the tilak ceremony, matching what you see in the product photos."
    : " This listing does not include roli or chawal — only the Rakhi design shown in the photos.";
  const setNote =
    spec.rakhiCount > 1
      ? ` You receive ${spec.rakhiCount} Rakhis as shown — ideal when you want multiple styles or brothers in one order.`
      : "";

  return [
    `<p><strong>${esc(name)}</strong> is a premium designer Rakhi choice for USA delivery. Sisters in India, the UK, Canada, Australia, and worldwide order from SpicyCorner so brothers across America receive festive packaging with reliable domestic shipping for Raksha Bandhan.</p>`,
    `<p>As shown in the product images, this listing features ${qtyPhrase(spec.rakhiCount)} with ${esc(spec.designSummary)}.${setNote}${ritualNote}</p>`,
    `<p><strong>What's included:</strong></p>`,
    `<ul>${includeLis}</ul>`,
    `<p>Every item above ships together. Perfect when you want to <strong>send Rakhi to USA</strong> with a clear, photo-accurate packing list — no chocolates, gift boxes, or extras beyond what is listed.</p>`,
    `<p><strong>Why sisters choose SpicyCorner for USA delivery:</strong></p>`,
    `<ul><li>Photo-matched what's-included list</li><li>Domestic USA shipping — no international customs delay for your brother</li><li>Festive packaging ready for Raksha Bandhan</li><li>Secure checkout in USD (Stripe) or INR (Razorpay)</li></ul>`,
    `<p>Looking for more options? Browse our <a href="/rakhi-combo-to-usa">Rakhi Combos</a> with chocolates, <a href="/single-rakhi-to-usa">Single Rakhi</a> designs, <a href="/kids-rakhi-to-usa">Kids Rakhi</a>, <a href="/bhaiya-bhabhi-rakhi-to-usa">Bhaiya Bhabhi sets</a>, or shop all <a href="/rakhi-hampers-to-usa">Rakhi Hampers</a> for USA delivery.</p>`,
    `<p>SKU: ${esc(spec.sku)}</p>`,
  ].join("\n");
}

function buildSeoDescription(name: string, spec: Spec): string {
  const qty =
    spec.rakhiCount === 1 ? "1 designer Rakhi" : `set of ${spec.rakhiCount} designer Rakhis`;
  const ritual = spec.hasRoliChawal ? " with complimentary roli and chawal" : "";
  return metaDescription(
    `Send ${name} to USA — ${qty}${ritual}. Domestic shipping for Raksha Bandhan from SpicyCorner.`
  );
}

async function main() {
  const applyDb = process.argv.includes("--db");
  const specs = JSON.parse(readFileSync(SPECS_PATH, "utf-8")) as Spec[];
  const results: { slug: string; name: string; description: string; seoDescription: string; includes: string[] }[] =
    [];

  for (const spec of specs) {
    const auditPath = join(AUDIT_DIR, `${spec.slug}.json`);
    if (!existsSync(auditPath)) {
      throw new Error(`Missing audit JSON for ${spec.slug}`);
    }
    const live = JSON.parse(readFileSync(auditPath, "utf-8")) as { name: string; sku?: string };
    const name = live.name;
    const description = buildDescription(name, spec);
    const seoDescription = buildSeoDescription(name, spec);
    results.push({ slug: spec.slug, name, description, seoDescription, includes: spec.includes });
  }

  writeFileSync(OUT_PATH, `${JSON.stringify(results, null, 2)}\n`);
  console.log(`Wrote ${results.length} descriptions → ${OUT_PATH}`);

  if (!applyDb) {
    console.log("Dry-run only. Re-run with --db to update DynamoDB description + seoDescription.");
    for (const r of results) {
      console.log(`- ${r.slug}: ${r.includes.join(" | ")}`);
    }
    return;
  }

  const ENV = process.env.ENVIRONMENT ?? "prod";
  const TABLE = process.env.PRODUCTS_TABLE ?? `spicycorner-products-${ENV}`;
  const REGION = process.env.AWS_DEFAULT_REGION ?? process.env.AWS_REGION ?? "us-east-1";
  const doc = DynamoDBDocumentClient.from(new DynamoDBClient({ region: REGION }));
  const now = new Date().toISOString();

  let updated = 0;
  for (const r of results) {
    await doc.send(
      new UpdateCommand({
        TableName: TABLE,
        Key: { PK: productKeys.pk(r.slug), SK: productKeys.sk() },
        UpdateExpression: "SET description = :d, seoDescription = :s, updatedAt = :now",
        ConditionExpression: "attribute_exists(PK)",
        ExpressionAttributeValues: {
          ":d": r.description,
          ":s": r.seoDescription,
          ":now": now,
        },
      })
    );
    updated++;
    console.log(`Updated ${r.slug}`);
  }
  console.log(`DB: updated ${updated}/${results.length} products in ${TABLE}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
