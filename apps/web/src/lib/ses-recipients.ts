import { isValidSesEmail, type SesRecipient } from "@spicycorner/shared";

export type RecipientParseResult = {
  valid: SesRecipient[];
  invalid: string[];
  duplicatesRemoved: number;
};

function parseLineColumns(header: string[], values: string[]): SesRecipient | null {
  const map: Record<string, string> = {};
  header.forEach((h, i) => {
    map[h.trim().toLowerCase()] = (values[i] ?? "").trim();
  });
  const email =
    map.email || map["e-mail"] || map["email address"] || map["email_address"] || "";
  if (!email || !isValidSesEmail(email)) return null;
  return {
    email: email.toLowerCase(),
    name: map.name || map["full name"] || undefined,
    company: map.company || map.organization || undefined,
    city: map.city || undefined,
    state: map.state || undefined,
    country: map.country || undefined,
  };
}

/** Parse CSV text into unique valid recipients. */
export function parseRecipientCsv(text: string): RecipientParseResult {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length === 0) return { valid: [], invalid: [], duplicatesRemoved: 0 };

  const split = (line: string) => {
    const out: string[] = [];
    let cur = "";
    let q = false;
    for (const ch of line) {
      if (ch === '"') q = !q;
      else if (ch === "," && !q) {
        out.push(cur);
        cur = "";
      } else cur += ch;
    }
    out.push(cur);
    return out.map((s) => s.replace(/^"|"$/g, "").trim());
  };

  const first = split(lines[0]!);
  const hasHeader = first.some((c) => /email/i.test(c));
  const header = hasHeader ? first.map((c) => c.toLowerCase()) : ["email", "name", "company", "city", "state", "country"];
  const rows = hasHeader ? lines.slice(1) : lines;

  const seen = new Set<string>();
  const valid: SesRecipient[] = [];
  const invalid: string[] = [];
  let duplicatesRemoved = 0;

  for (const line of rows) {
    // Manual paste: bare emails
    if (!line.includes(",") && isValidSesEmail(line)) {
      const email = line.toLowerCase();
      if (seen.has(email)) {
        duplicatesRemoved += 1;
        continue;
      }
      seen.add(email);
      valid.push({ email });
      continue;
    }
    const cols = split(line);
    const row = parseLineColumns(header, cols);
    if (!row) {
      invalid.push(line.slice(0, 80));
      continue;
    }
    if (seen.has(row.email)) {
      duplicatesRemoved += 1;
      continue;
    }
    seen.add(row.email);
    valid.push(row);
  }

  return { valid, invalid, duplicatesRemoved };
}

/** Parse comma/newline manual email list. */
export function parseManualEmails(text: string): RecipientParseResult {
  const tokens = text
    .split(/[\n,;]+/)
    .map((t) => t.trim())
    .filter(Boolean);
  const seen = new Set<string>();
  const valid: SesRecipient[] = [];
  const invalid: string[] = [];
  let duplicatesRemoved = 0;
  for (const t of tokens) {
    if (!isValidSesEmail(t)) {
      invalid.push(t);
      continue;
    }
    const email = t.toLowerCase();
    if (seen.has(email)) {
      duplicatesRemoved += 1;
      continue;
    }
    seen.add(email);
    valid.push({ email });
  }
  return { valid, invalid, duplicatesRemoved };
}
