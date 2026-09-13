import { getApiUrl } from "@/lib/env";
import { NextResponse } from "next/server";

type Props = { params: Promise<{ token: string }> };

export async function GET(_req: Request, { params }: Props) {
  const { token } = await params;
  const res = await fetch(`${getApiUrl()}/email/click/${encodeURIComponent(token)}`, {
    redirect: "manual",
    cache: "no-store",
  });
  const location = res.headers.get("Location") || "https://www.spicycenter.com";
  return NextResponse.redirect(location, 302);
}
