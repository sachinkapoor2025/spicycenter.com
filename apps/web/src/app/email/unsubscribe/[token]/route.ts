import { getApiUrl } from "@/lib/env";

type Props = { params: Promise<{ token: string }> };

export async function GET(_req: Request, { params }: Props) {
  const { token } = await params;
  const res = await fetch(`${getApiUrl()}/email/unsubscribe/${encodeURIComponent(token)}`, {
    cache: "no-store",
  });
  const data = (await res.json().catch(() => ({}))) as { message?: string };
  const message = data.message || "You have been unsubscribed.";
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Unsubscribe</title>
  <style>body{font-family:system-ui,sans-serif;max-width:480px;margin:48px auto;padding:0 16px;color:#0f172a}
  h1{font-size:22px}p{color:#475569;line-height:1.5}</style></head>
  <body><h1>SpicyCorner</h1><p>${message.replace(/</g, "&lt;")}</p>
  <p><a href="https://www.spicycenter.com">Return to store</a></p></body></html>`;
  return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
}
