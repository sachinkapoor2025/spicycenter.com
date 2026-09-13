/**
 * Test SMTP from your machine (uses apps/api/.env or exported env vars).
 * Usage: SMTP_PASS='your-password' npx tsx scripts/test-smtp.ts
 */
import nodemailer from "nodemailer";

const host = process.env.SMTP_HOST ?? "smtp.spicycenter.com";
const user = process.env.SMTP_USER ?? "order@spicycorner.com";
const pass = process.env.SMTP_PASS;
const notify = process.env.NOTIFY_EMAIL ?? user;
const testTo = process.argv[2] ?? notify;

if (!pass) {
  console.error("Set SMTP_PASS (mailbox password) in env");
  process.exit(1);
}

async function trySend(port: number, secure: boolean) {
  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
    requireTLS: !secure,
    tls: { minVersion: "TLSv1.2" },
  });
  await transporter.verify();
  await transporter.sendMail({
    from: `"SpicyCorner Test" <${user}>`,
    to: testTo,
    subject: `[SpicyCorner] SMTP test ${new Date().toISOString()}`,
    text: `SMTP test OK via ${host}:${port} (secure=${secure})`,
  });
  console.log(`✓ Sent test email via ${host}:${port} secure=${secure} → ${testTo}`);
}

async function main() {
  const hosts = [host, "mail.spicycenter.com"].filter((h, i, a) => a.indexOf(h) === i);
  for (const h of hosts) {
    for (const [port, secure] of [
      [465, true],
      [587, false],
    ] as const) {
      try {
        const t = nodemailer.createTransport({
          host: h,
          port,
          secure,
          auth: { user, pass },
          requireTLS: !secure,
          tls: { minVersion: "TLSv1.2" },
        });
        await t.verify();
        await t.sendMail({
          from: `"SpicyCorner Test" <${user}>`,
          to: testTo,
          subject: `[SpicyCorner] SMTP test ${new Date().toISOString()}`,
          text: `SMTP test OK via ${h}:${port}`,
        });
        console.log(`✓ ${h}:${port} secure=${secure} → ${testTo}`);
        return;
      } catch (err) {
        console.error(`✗ ${h}:${port} secure=${secure}:`, err instanceof Error ? err.message : err);
      }
    }
  }
  process.exit(1);
}

main();
