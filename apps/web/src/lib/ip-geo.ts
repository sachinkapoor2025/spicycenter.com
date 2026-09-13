/** Public client IP from reverse-proxy headers. Skips loopback / private ranges. */
export function publicClientIp(headers: Headers): string | undefined {
  const candidates = [
    headers.get("cf-connecting-ip"),
    headers.get("x-real-ip"),
    headers.get("x-forwarded-for")?.split(",")[0],
  ];
  for (const raw of candidates) {
    const ip = raw?.trim();
    if (ip && isPublicIp(ip)) return ip;
  }
  return undefined;
}

function isPublicIp(ip: string): boolean {
  const v = ip.replace(/^::ffff:/, "");
  if (v === "::1" || v === "127.0.0.1") return false;
  if (v.startsWith("10.") || v.startsWith("192.168.") || v.startsWith("127.")) return false;
  const parts = v.split(".").map(Number);
  if (parts.length === 4 && parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return false;
  return true;
}

function countryFromUnknown(data: unknown): string | undefined {
  if (!data || typeof data !== "object") return undefined;
  const record = data as Record<string, unknown>;
  const code = record.country_code ?? record.countryCode ?? record.country;
  if (typeof code !== "string") return undefined;
  const normalized = code.trim().toUpperCase();
  return /^[A-Z]{2}$/.test(normalized) ? normalized : undefined;
}

/** Best-effort ISO country from a public IP (used when CDN geo headers are missing). */
export async function lookupCountryFromIp(ip: string): Promise<string | undefined> {
  const urls = [
    `https://ipwho.is/${encodeURIComponent(ip)}?fields=success,country_code`,
    `https://ipapi.co/${encodeURIComponent(ip)}/json/`,
  ];
  for (const url of urls) {
    try {
      const res = await fetch(url, {
        signal: AbortSignal.timeout(2500),
        cache: "no-store",
        headers: { Accept: "application/json" },
      });
      if (!res.ok) continue;
      const code = countryFromUnknown(await res.json());
      if (code) return code;
    } catch {
      /* try next provider */
    }
  }
  return undefined;
}

/** Browser-side lookup using the visitor's public IP (works on localhost). */
export async function detectCountryFromClientIp(): Promise<string | undefined> {
  const signal = AbortSignal.timeout(2500);
  try {
    const res = await fetch("https://ipwho.is/?fields=success,country_code", {
      signal,
      cache: "no-store",
    });
    if (res.ok) {
      const code = countryFromUnknown(await res.json());
      if (code) return code;
    }
  } catch {
    /* fall through */
  }
  return undefined;
}
