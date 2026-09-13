import { NextResponse } from "next/server";
import { contactFormSchema } from "@spicycorner/shared";
import { getApiUrl } from "@/lib/env";

/** Proxies contact submissions to Lambda /leads (SMTP lives on API, not Amplify). */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = contactFormSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
    }

    const { name, email, phone, message, sessionId } = parsed.data;
    const sid = sessionId ?? `contact-${Date.now()}`;

    const res = await fetch(`${getApiUrl()}/leads`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Session-Id": sid,
      },
      body: JSON.stringify({
        sessionId: sid,
        name,
        email,
        phone,
        page: "/contact",
        source: "contact",
        metadata: { message },
      }),
    });

    const data = (await res.json().catch(() => ({}))) as { error?: string; emailSent?: boolean };

    if (!res.ok) {
      return NextResponse.json(
        { error: data.error ?? "Could not send message. Please try WhatsApp or email order@spicycorner.com." },
        { status: res.status >= 400 && res.status < 600 ? res.status : 502 }
      );
    }

    if (data.emailSent === false) {
      return NextResponse.json(
        { error: "Your message was saved but email could not be sent. Please email order@spicycorner.com directly." },
        { status: 502 }
      );
    }

    return NextResponse.json({ ok: true, emailSent: true });
  } catch (err) {
    console.error("contact route error:", err);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}

export const runtime = "nodejs";
