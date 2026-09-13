/**
 * Update marketing SMTP settings in DynamoDB (Mailercloud).
 *
 * Env:
 *   MARKETING_SMTP_PASS  (required)
 *   MARKETING_SMTP_USER  (default order@spicycorner.com)
 *   MARKETING_SMTP_HOST  (default smtp-prod.mailrcld.com)
 *   MARKETING_SMTP_PORT  (default 587)
 *   ENVIRONMENT          (default prod)
 *
 * Also set AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY / AWS_SESSION_TOKEN.
 *
 *   MARKETING_SMTP_PASS='…' npx tsx scripts/update-marketing-smtp.ts
 */
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, PutCommand } from "@aws-sdk/lib-dynamodb";
import { sesEmailKeys, sesSettingsSchema, type SesSettings } from "@spicycorner/shared";

const ENV = process.env.ENVIRONMENT ?? "prod";
const TABLE = process.env.EMAIL_CAMPAIGNS_TABLE ?? `spicycorner-email-campaigns-${ENV}`;
const REGION = process.env.AWS_DEFAULT_REGION ?? process.env.AWS_REGION ?? "us-east-1";

async function main() {
  const pass = process.env.MARKETING_SMTP_PASS?.trim();
  if (!pass) {
    console.error("Set MARKETING_SMTP_PASS");
    process.exit(1);
  }

  const doc = DynamoDBDocumentClient.from(new DynamoDBClient({ region: REGION }));
  const key = { PK: sesEmailKeys.settingsPk(), SK: sesEmailKeys.settingsSk() };
  const existing = await doc.send(new GetCommand({ TableName: TABLE, Key: key }));
  const prev = (existing.Item?.settings as Partial<SesSettings> | undefined) ?? {};

  const port = Number(process.env.MARKETING_SMTP_PORT || prev.smtpPort || 587);
  const secureEnv = process.env.MARKETING_SMTP_SECURE?.trim().toLowerCase();
  const smtpSecure =
    secureEnv === "true" || secureEnv === "1"
      ? true
      : secureEnv === "false" || secureEnv === "0"
        ? false
        : port === 465;

  const merged = {
    ...prev,
    marketingTransport: "smtp" as const,
    smtpHost:
      process.env.MARKETING_SMTP_HOST?.trim() || prev.smtpHost || "smtp-prod.mailrcld.com",
    smtpPort: Number.isFinite(port) && port > 0 ? port : 587,
    smtpSecure,
    smtpUser:
      process.env.MARKETING_SMTP_USER?.trim() || prev.smtpUser || "order@spicycorner.com",
    smtpPassword: pass,
  };

  const parsed = sesSettingsSchema.safeParse(merged);
  if (!parsed.success) {
    console.error(parsed.error.message);
    process.exit(1);
  }

  const now = new Date().toISOString();
  await doc.send(
    new PutCommand({
      TableName: TABLE,
      Item: {
        PK: key.PK,
        SK: key.SK,
        settings: parsed.data,
        updatedAt: now,
      },
    })
  );

  console.log(`Updated ${TABLE} marketing SMTP`);
  console.log(`  host=${parsed.data.smtpHost}:${parsed.data.smtpPort} secure=${parsed.data.smtpSecure}`);
  console.log(`  user=${parsed.data.smtpUser}`);
  console.log(`  password length=${pass.length}`);
  console.log("Cold Lambda will pick this up within ~30s (transport cache).");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
