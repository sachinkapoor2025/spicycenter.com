import { getApiUrl } from "@/lib/env";

type Props = { params: Promise<{ token: string }> };

export async function GET(_req: Request, { params }: Props) {
  const { token } = await params;
  const res = await fetch(`${getApiUrl()}/email/open/${encodeURIComponent(token)}`, {
    cache: "no-store",
  });
  const buf = Buffer.from(await res.arrayBuffer());
  return new Response(buf, {
    status: 200,
    headers: {
      "Content-Type": "image/gif",
      "Cache-Control": "no-store",
    },
  });
}
