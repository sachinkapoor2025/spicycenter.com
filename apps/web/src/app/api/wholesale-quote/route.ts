import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body.email !== "string" || typeof body.company !== "string") {
    return NextResponse.json({ error: "Invalid form" }, { status: 400 });
  }
  return NextResponse.json({
    ok: true,
    reference: `WC-${Date.now().toString().slice(-5)}`,
    message: "Quote stored as a lead payload. Connect SES/Lambda before production.",
  });
}
