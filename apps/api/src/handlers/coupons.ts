import { GetCommand, PutCommand, ScanCommand, TransactWriteCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import type { APIGatewayProxyEventV2 } from "aws-lambda";
import { randomBytes } from "crypto";
import {
  couponValidateSchema,
  createAdminCouponSchema,
  createTestOrderCouponSchema,
  couponKeys,
  WELCOME_COUPON_HOURS,
  ABANDONED_CART_COUPON_HOURS,
  ABANDONED_CART_DISCOUNT_PERCENT,
  adminCouponHoursForDiscount,
  isAdminConfirmedSaleDiscount,
  isTestOrderCoupon,
  pickDailyDealDiscount,
  dailyDealDayKey,
  normalizePhone,
  TEST_ORDER_COUPON_KIND,
  TEST_ORDER_COUPON_MINUTES,
  TEST_ORDER_FORCE_TOTAL_USD,
  type CouponValidationResult,
  type WelcomeCoupon,
  type StoreCoupon,
  type DailyDealPercent,
} from "@spicycorner/shared";
import { docClient, CONFIG_TABLE, now } from "../lib/db";
import { ok, badRequest, forbidden, unauthorized, serverError } from "../lib/response";
import { requireAdmin } from "../lib/auth";
import { sendAdminAbandonedCouponEmails } from "../lib/email";
import {
  abandonedCouponWhatsAppMessage,
  sendWhatsAppMessage,
} from "../lib/whatsapp";

function generateCode(prefix = "SPICY"): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = randomBytes(6);
  let suffix = "";
  for (let i = 0; i < 6; i++) suffix += chars[bytes[i]! % chars.length];
  return `${prefix}-${suffix}`;
}

function welcomeExpiresAt(from = new Date()): string {
  return new Date(from.getTime() + WELCOME_COUPON_HOURS * 60 * 60 * 1000).toISOString();
}

function normalizeEmail(email?: string | null): string | undefined {
  const trimmed = email?.trim().toLowerCase();
  if (!trimmed || !trimmed.includes("@")) return undefined;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return undefined;
  return trimmed;
}

type CouponContact = { email?: string; phone?: string };

type WelcomeCouponIssueResult = {
  code: string;
  expiresAt: string;
  discountPercent: number;
  reused: boolean;
  /** True when this phone (or email) already claimed a spin for today's calendar day. */
  alreadyClaimedToday?: boolean;
};

async function getConfigItem(pk: string, sk: string): Promise<Record<string, unknown> | undefined> {
  const existing = await docClient.send(
    new GetCommand({
      TableName: CONFIG_TABLE,
      Key: { PK: pk, SK: sk },
    })
  );
  return existing.Item as Record<string, unknown> | undefined;
}

async function getWelcomePhoneRecord(phoneDigits: string) {
  return getConfigItem(couponKeys.welcomePhonePk(phoneDigits), couponKeys.welcomePhoneSk());
}

async function getWelcomeEmailRecord(email: string) {
  return getConfigItem(couponKeys.welcomeEmailPk(email), couponKeys.welcomeEmailSk());
}

async function getActiveWelcomeCouponForContact(
  contact: CouponContact,
  code = ""
): Promise<WelcomeCouponIssueResult | null> {
  const activeCode =
    code ||
    ((contact.phone
      ? (await getWelcomePhoneRecord(contact.phone))?.code
      : undefined) as string | undefined) ||
    ((contact.email
      ? (await getWelcomeEmailRecord(contact.email))?.code
      : undefined) as string | undefined);
  if (!activeCode) return null;

  const active = await validateCouponRecord(activeCode, contact);
  if (!active.valid) return null;

  return {
    code: active.code!,
    expiresAt: active.expiresAt!,
    discountPercent: active.discountPercent!,
    reused: true,
  };
}

export async function validateCouponRecord(
  code: string,
  contact: string | CouponContact
): Promise<CouponValidationResult> {
  const normalizedCode = code.trim().toUpperCase();
  const email =
    typeof contact === "string" ? normalizeEmail(contact) : normalizeEmail(contact.email);
  const phone =
    typeof contact === "string" ? undefined : normalizePhone(contact.phone);

  const result = await docClient.send(
    new GetCommand({
      TableName: CONFIG_TABLE,
      Key: { PK: couponKeys.pk(normalizedCode), SK: couponKeys.sk() },
    })
  );

  const coupon = result.Item as StoreCoupon | undefined;
  if (!coupon) {
    return { valid: false, error: "Invalid coupon code" };
  }

  if (coupon.usedAt) {
    return { valid: false, error: "This coupon has already been used" };
  }

  if (new Date(coupon.expiresAt).getTime() < Date.now()) {
    return { valid: false, error: "This coupon has expired" };
  }

  const couponEmail = normalizeEmail(coupon.email);
  const couponPhone = normalizePhone(coupon.phone);
  const emailMatch = Boolean(email && couponEmail && email === couponEmail);
  const phoneMatch = Boolean(phone && couponPhone && phone === couponPhone);

  if (!emailMatch && !phoneMatch) {
    return {
      valid: false,
      error: "This coupon is registered to a different phone number or email",
    };
  }

  return {
    valid: true,
    code: coupon.code,
    discountPercent: coupon.discountPercent,
    expiresAt: coupon.expiresAt,
    ...(isTestOrderCoupon(coupon)
      ? {
          kind: TEST_ORDER_COUPON_KIND,
          forceTotalUsd: coupon.forceTotalUsd ?? TEST_ORDER_FORCE_TOTAL_USD,
        }
      : { kind: "percent" as const }),
  };
}

/**
 * Discount of the Day — spin result.
 * One coupon per phone per calendar day (America/New_York); valid for WELCOME_COUPON_HOURS.
 * Email is optional (used for delivery of the code when provided).
 */
export async function issueWelcomeCoupon(input: {
  phone: string;
  email?: string;
  sessionId?: string;
  /** Client spin result — accepted only if 6|7|8|10 so animation can start instantly. */
  discountPercent?: number;
}): Promise<WelcomeCouponIssueResult> {
  const phone = normalizePhone(input.phone);
  if (!phone) throw new Error("Enter a valid mobile number to spin");
  const email = normalizeEmail(input.email);
  const timestamp = now();
  const dayKey = dailyDealDayKey();
  const contact: CouponContact = { phone, email };

  const phoneRecord = await getWelcomePhoneRecord(phone);
  const existingCode = phoneRecord?.code as string | undefined;
  const existingDayKey = phoneRecord?.dayKey as string | undefined;

  if (existingDayKey === dayKey && existingCode) {
    const active = await getActiveWelcomeCouponForContact(contact, existingCode);
    if (active) {
      return { ...active, alreadyClaimedToday: true };
    }
    return {
      code: existingCode,
      expiresAt: (phoneRecord?.expiresAt as string) ?? timestamp,
      discountPercent: Number(phoneRecord?.discountPercent ?? 0),
      reused: true,
      alreadyClaimedToday: true,
    };
  }

  // Legacy email-only spins: if this email already claimed today, reuse that claim.
  if (email) {
    const emailRecord = await getWelcomeEmailRecord(email);
    if (emailRecord?.dayKey === dayKey && emailRecord.code) {
      const active = await getActiveWelcomeCouponForContact(
        { email },
        emailRecord.code as string
      );
      if (active) return { ...active, alreadyClaimedToday: true };
      return {
        code: emailRecord.code as string,
        expiresAt: (emailRecord.expiresAt as string) ?? timestamp,
        discountPercent: Number(emailRecord.discountPercent ?? 0),
        reused: true,
        alreadyClaimedToday: true,
      };
    }
  }

  const existingActive = await getActiveWelcomeCouponForContact(contact, existingCode);
  if (existingActive) {
    return { ...existingActive, alreadyClaimedToday: false };
  }

  // Always issue maximum Discount of the Day (10%), regardless of client spin hint.
  const discountPercent: DailyDealPercent = pickDailyDealDiscount();
  const expiresAt = welcomeExpiresAt();
  const code = generateCode();
  const coupon: WelcomeCoupon & { PK: string; SK: string } = {
    PK: couponKeys.pk(code),
    SK: couponKeys.sk(),
    code,
    ...(email ? { email } : {}),
    phone,
    discountPercent,
    expiresAt,
    createdAt: timestamp,
    sessionId: input.sessionId,
    source: "welcome",
    dayKey,
  };

  const phoneIndex = {
    PK: couponKeys.welcomePhonePk(phone),
    SK: couponKeys.welcomePhoneSk(),
    code,
    expiresAt,
    createdAt: timestamp,
    phone,
    ...(email ? { email } : {}),
    dayKey,
    discountPercent,
  };

  try {
    const transactItems: {
      Put: {
        TableName: string;
        Item: Record<string, unknown>;
        ConditionExpression: string;
        ExpressionAttributeValues?: Record<string, string>;
      };
    }[] = [
      {
        Put: {
          TableName: CONFIG_TABLE,
          Item: coupon,
          ConditionExpression: "attribute_not_exists(PK)",
        },
      },
      {
        Put: {
          TableName: CONFIG_TABLE,
          Item: phoneIndex,
          ConditionExpression:
            "attribute_not_exists(PK) OR attribute_not_exists(dayKey) OR dayKey <> :today OR expiresAt < :now",
          ExpressionAttributeValues: {
            ":today": dayKey,
            ":now": timestamp,
          },
        },
      },
    ];

    if (email) {
      transactItems.push({
        Put: {
          TableName: CONFIG_TABLE,
          Item: {
            PK: couponKeys.welcomeEmailPk(email),
            SK: couponKeys.welcomeEmailSk(),
            code,
            expiresAt,
            createdAt: timestamp,
            email,
            phone,
            dayKey,
            discountPercent,
          },
          ConditionExpression:
            "attribute_not_exists(PK) OR attribute_not_exists(dayKey) OR dayKey <> :today OR expiresAt < :now",
          ExpressionAttributeValues: {
            ":today": dayKey,
            ":now": timestamp,
          },
        },
      });
    }

    await docClient.send(new TransactWriteCommand({ TransactItems: transactItems }));
  } catch {
    const activeCoupon = await getActiveWelcomeCouponForContact(contact);
    if (activeCoupon) return { ...activeCoupon, alreadyClaimedToday: true };
    const again = await getWelcomePhoneRecord(phone);
    if (again?.dayKey === dayKey && again.code) {
      return {
        code: again.code as string,
        expiresAt: (again.expiresAt as string) ?? timestamp,
        discountPercent: Number(again.discountPercent ?? 0),
        reused: true,
        alreadyClaimedToday: true,
      };
    }
    throw new Error("Could not issue discount coupon");
  }

  return { code, expiresAt, discountPercent, reused: false, alreadyClaimedToday: false };
}

export async function issueAbandonedCartCoupon(input: {
  email: string;
  sessionId?: string;
}): Promise<{ code: string; expiresAt: string; discountPercent: number }> {
  const email = normalizeEmail(input.email);
  if (!email) throw new Error("Email is required for abandoned cart coupon");
  const timestamp = now();
  const expiresAt = new Date(
    Date.now() + ABANDONED_CART_COUPON_HOURS * 60 * 60 * 1000
  ).toISOString();

  const existing = await docClient.send(
    new GetCommand({
      TableName: CONFIG_TABLE,
      Key: { PK: couponKeys.abandonedEmailPk(email), SK: couponKeys.abandonedEmailSk() },
    })
  );

  const activeCode = existing.Item?.code as string | undefined;
  if (activeCode) {
    const active = await validateCouponRecord(activeCode, email);
    if (active.valid) {
      return {
        code: active.code!,
        expiresAt: active.expiresAt!,
        discountPercent: active.discountPercent!,
      };
    }
  }

  const code = generateCode();
  const coupon: StoreCoupon & { PK: string; SK: string } = {
    PK: couponKeys.pk(code),
    SK: couponKeys.sk(),
    code,
    email,
    discountPercent: ABANDONED_CART_DISCOUNT_PERCENT,
    expiresAt,
    createdAt: timestamp,
    sessionId: input.sessionId,
    source: "abandoned",
  };

  await docClient.send(new PutCommand({ TableName: CONFIG_TABLE, Item: coupon }));
  await docClient.send(
    new PutCommand({
      TableName: CONFIG_TABLE,
      Item: {
        PK: couponKeys.abandonedEmailPk(email),
        SK: couponKeys.abandonedEmailSk(),
        code,
        expiresAt,
        createdAt: timestamp,
        email,
      },
    })
  );

  return { code, expiresAt, discountPercent: ABANDONED_CART_DISCOUNT_PERCENT };
}

export async function markCouponUsed(code: string, orderId: string): Promise<void> {
  const normalizedCode = code.trim().toUpperCase();
  const timestamp = now();

  await docClient.send(
    new UpdateCommand({
      TableName: CONFIG_TABLE,
      Key: { PK: couponKeys.pk(normalizedCode), SK: couponKeys.sk() },
      UpdateExpression: "SET usedAt = :usedAt, orderId = :orderId",
      ConditionExpression: "attribute_exists(PK) AND attribute_not_exists(usedAt)",
      ExpressionAttributeValues: {
        ":usedAt": timestamp,
        ":orderId": orderId,
      },
    })
  ).catch(() => {
    /* already used or missing — non-blocking */
  });
}

export function applyPercentDiscount(subtotal: number, percent: number): number {
  return Math.round(subtotal * (percent / 100) * 100) / 100;
}

export async function validateCouponHandler(event: APIGatewayProxyEventV2) {
  const body = JSON.parse(event.body ?? "{}");
  const parsed = couponValidateSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.message);

  const result = await validateCouponRecord(parsed.data.code, {
    email: parsed.data.email,
    phone: parsed.data.phone,
  });
  if (!result.valid) return badRequest(result.error ?? "Invalid coupon");

  return ok(result);
}

export async function listWelcomeCoupons(event: APIGatewayProxyEventV2) {
  if (!requireAdmin(event)) return forbidden();

  const result = await docClient.send(
    new ScanCommand({
      TableName: CONFIG_TABLE,
      FilterExpression: "begins_with(PK, :prefix) AND SK = :sk AND #src = :src",
      ExpressionAttributeNames: { "#src": "source" },
      ExpressionAttributeValues: {
        ":prefix": "COUPON#",
        ":sk": "META",
        ":src": "welcome",
      },
    })
  );

  const coupons = ((result.Items ?? []) as WelcomeCoupon[]).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return ok({ coupons });
}

/** Admin: generate coupon bound to email and/or phone (outreach or confirmed sale). */
export async function createAdminAbandonedCoupon(event: APIGatewayProxyEventV2) {
  const auth = requireAdmin(event);
  if (!auth) return unauthorized("Admin access required");

  let body: unknown;
  try {
    body = JSON.parse(event.body ?? "{}");
  } catch {
    return badRequest("Invalid JSON");
  }

  const parsed = createAdminCouponSchema.safeParse(body);
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? parsed.error.message;
    return badRequest(msg);
  }

  const email = normalizeEmail(parsed.data.email);
  // Coupon binding uses mobile digits only (country code ignored at validate time).
  const phone = normalizePhone(parsed.data.phone);
  const whatsappPhone =
    parsed.data.whatsappPhone?.trim() ||
    parsed.data.phone?.trim() ||
    undefined;
  if (!email && !phone) {
    return badRequest("Enter a customer email or mobile number");
  }

  const discountPercent = parsed.data.discountPercent;
  const confirmedSale =
    parsed.data.confirmedSale === true || isAdminConfirmedSaleDiscount(discountPercent);
  const hours = adminCouponHoursForDiscount(discountPercent);
  const timestamp = now();
  const expiresAt = new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
  const code = generateCode();

  const coupon: StoreCoupon & { PK: string; SK: string } = {
    PK: couponKeys.pk(code),
    SK: couponKeys.sk(),
    code,
    ...(email ? { email } : {}),
    ...(phone ? { phone } : {}),
    discountPercent,
    expiresAt,
    createdAt: timestamp,
    source: "admin",
    createdBy: auth.email,
    ...(confirmedSale ? { confirmedSale: true } : {}),
  };

  try {
    await docClient.send(
      new PutCommand({
        TableName: CONFIG_TABLE,
        Item: coupon,
        ConditionExpression: "attribute_not_exists(PK)",
      })
    );
  } catch (err) {
    console.error("createAdminAbandonedCoupon put failed:", err);
    return serverError("Could not create coupon — please try again");
  }

  const waMessage = abandonedCouponWhatsAppMessage({
    code,
    discountPercent,
    expiresAt,
    confirmedSale,
  });
  // Prefer Twilio: Meta free-form text is blocked outside the 24h care window
  // for business-initiated coupon messages (email still works independently).
  const whatsapp = whatsappPhone
    ? await sendWhatsAppMessage({
        phone: whatsappPhone,
        message: waMessage,
        prefer: "twilio",
      })
    : {
        ok: false,
        skipped: true as const,
        deepLink: "",
        provider: undefined as string | undefined,
        error: "No phone provided",
      };
  if (whatsappPhone && !whatsapp.ok && !whatsapp.skipped) {
    console.error("createAdminAbandonedCoupon WhatsApp failed", {
      error: whatsapp.error,
      provider: whatsapp.provider,
    });
  }

  const emails = await sendAdminAbandonedCouponEmails({
    customerEmail: email,
    phone: phone ?? whatsappPhone,
    code,
    discountPercent,
    expiresAt,
    hours,
    confirmedSale,
    createdByAdminEmail: auth.email,
    whatsappDeepLink: whatsapp.deepLink || undefined,
  });

  return ok({
    coupon: {
      code,
      email,
      phone,
      discountPercent,
      expiresAt,
      createdAt: timestamp,
      createdBy: auth.email,
      source: "admin" as const,
      confirmedSale,
    },
    emails: {
      customerOk: emails.customer.ok,
      notifyOk: emails.notify.ok,
      customerError: emails.customer.error,
      notifyError: emails.notify.error,
    },
    whatsapp: {
      sent: whatsapp.ok,
      skipped: Boolean(whatsapp.skipped),
      provider: whatsapp.provider,
      deepLink: whatsapp.deepLink,
      error: whatsapp.error,
    },
  });
}

/** Admin: 20-minute coupon that forces checkout total (items + shipping) to $1 USD. */
export async function createAdminTestOrderCoupon(event: APIGatewayProxyEventV2) {
  const auth = requireAdmin(event);
  if (!auth) return unauthorized("Admin access required");

  let body: unknown;
  try {
    body = JSON.parse(event.body ?? "{}");
  } catch {
    return badRequest("Invalid JSON");
  }

  const parsed = createTestOrderCouponSchema.safeParse(body);
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? parsed.error.message;
    return badRequest(msg);
  }

  const email = normalizeEmail(parsed.data.email);
  const phone = normalizePhone(parsed.data.phone);
  if (!email && !phone) {
    return badRequest("Enter a customer email or mobile number");
  }

  const timestamp = now();
  const expiresAt = new Date(Date.now() + TEST_ORDER_COUPON_MINUTES * 60 * 1000).toISOString();
  const code = generateCode("TEST");

  const coupon: StoreCoupon & { PK: string; SK: string } = {
    PK: couponKeys.pk(code),
    SK: couponKeys.sk(),
    code,
    ...(email ? { email } : {}),
    ...(phone ? { phone } : {}),
    discountPercent: 100,
    expiresAt,
    createdAt: timestamp,
    source: "admin",
    createdBy: auth.email,
    kind: TEST_ORDER_COUPON_KIND,
    forceTotalUsd: TEST_ORDER_FORCE_TOTAL_USD,
  };

  try {
    await docClient.send(
      new PutCommand({
        TableName: CONFIG_TABLE,
        Item: coupon,
        ConditionExpression: "attribute_not_exists(PK)",
      })
    );
  } catch (err) {
    console.error("createAdminTestOrderCoupon put failed:", err);
    return serverError("Could not create test coupon — please try again");
  }

  return ok({
    coupon: {
      code,
      email,
      phone,
      discountPercent: 100,
      expiresAt,
      createdAt: timestamp,
      createdBy: auth.email,
      source: "admin" as const,
      kind: TEST_ORDER_COUPON_KIND,
      forceTotalUsd: TEST_ORDER_FORCE_TOTAL_USD,
    },
  });
}

export async function listAdminCoupons(event: APIGatewayProxyEventV2) {
  if (!requireAdmin(event)) return forbidden();

  const result = await docClient.send(
    new ScanCommand({
      TableName: CONFIG_TABLE,
      FilterExpression: "begins_with(PK, :prefix) AND SK = :sk AND #src = :src",
      ExpressionAttributeNames: { "#src": "source" },
      ExpressionAttributeValues: {
        ":prefix": "COUPON#",
        ":sk": "META",
        ":src": "admin",
      },
    })
  );

  const coupons = ((result.Items ?? []) as StoreCoupon[]).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return ok({ coupons });
}
