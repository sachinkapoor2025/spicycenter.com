import { NextResponse } from "next/server";
import { getApiUrl } from "@/lib/env";

/** Proxies wholesale quotes to Lambda /leads (SMTP lives on API, not Amplify). */
export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body || typeof body.email !== "string" || typeof body.company !== "string") {
      return NextResponse.json({ error: "Invalid form" }, { status: 400 });
    }

    const email = body.email.trim();
    const company = String(body.company).trim();
    const contactName = typeof body.contactName === "string" ? body.contactName.trim() : "";
    const phone = typeof body.phone === "string" ? body.phone.trim() : "";
    const sessionId =
      (typeof body.sessionId === "string" && body.sessionId.trim()) || `wholesale-${Date.now()}`;

    const metadata: Record<string, string> = {};
    for (const [key, value] of Object.entries(body)) {
      if (typeof value === "string" && value.trim()) metadata[key] = value.trim();
    }

    const res = await fetch(`${getApiUrl()}/leads`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Session-Id": sessionId,
      },
      body: JSON.stringify({
        sessionId,
        name: contactName || company,
        email,
        phone: phone || undefined,
        page: "/wholesale",
        source: "wholesale",
        metadata,
      }),
    });

    const data = (await res.json().catch(() => ({}))) as { error?: string; emailSent?: boolean };
    if (!res.ok) {
      return NextResponse.json(
        { error: data.error ?? "Could not send quote request. Email enquiry@spicycenter.com." },
        { status: res.status >= 400 && res.status < 600 ? res.status : 502 }
      );
    }
    if (data.emailSent === false) {
      return NextResponse.json(
        { error: "Saved but email could not be sent. Please email enquiry@spicycenter.com." },
        { status: 502 }
      );
    }
    return NextResponse.json({ ok: true, emailSent: true });
  } catch (err) {
    console.error("wholesale-quote route error:", err);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}

export const runtime = "nodejs";
