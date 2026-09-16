/**
 * Key builders for the multi-table DynamoDB design.
 * Each domain has its own table; builders below are grouped per table.
 */

// ---- products table (products + categories) ----
export const productKeys = {
  pk: (slug: string) => `PRODUCT#${slug}`,
  sk: () => "META" as const,
  gsi1pk: (categorySlug: string) => `CATEGORY#${categorySlug}`,
  gsi1sk: (slug: string) => `PRODUCT#${slug}`,
  /** Cached CJ freight quote for one variant → destination. */
  freightSk: (country: string, vid: string) => `FREIGHT#${country.toUpperCase()}#${vid}`,
};

export const categoryKeys = {
  pk: (slug: string) => `CATEGORY#${slug}`,
  sk: () => "META" as const,
  /** GSI1: list all categories without table Scan */
  gsi1pk: () => "ENTITY#CATEGORY" as const,
  gsi1sk: (sortOrder: number, slug: string) =>
    `${String(Math.max(0, sortOrder || 0)).padStart(6, "0")}#${slug}`,
};

/** Product reviews live in the products table under PRODUCT#slug / REVIEW#id. */
export const reviewKeys = {
  pk: (productSlug: string) => `PRODUCT#${productSlug}`,
  sk: (reviewId: string) => `REVIEW#${reviewId}`,
  skPrefix: () => "REVIEW#" as const,
  /** GSI1: global published review feed by date */
  gsi1pk: () => "ENTITY#REVIEW" as const,
  gsi1sk: (createdAt: string, reviewId: string) => `${createdAt}#${reviewId}`,
};

// ---- orders table ----
export const orderKeys = {
  pk: (orderId: string) => `ORDER#${orderId}`,
  sk: () => "META" as const,
  // GSI1: list a customer's orders by date
  gsi1pk: (userKey: string) => `USER#${userKey}`,
  gsi1sk: (createdAt: string) => createdAt,
  // GSI2: global admin feed by date
  gsi2pk: () => "ENTITY#ORDER" as const,
  gsi2sk: (createdAt: string) => createdAt,
  // GSI3: filter by status, sorted by date
  gsi3pk: (status: string) => `STATUS#${status}`,
  gsi3sk: (createdAt: string) => createdAt,
  /** Atomic counters for human order numbers (OC / US). HW allocations reuse the US counter. */
  counterPk: (prefix: "OC" | "US" | "HW") =>
    `COUNTER#ORDER#${prefix === "HW" ? "US" : prefix}`,
  counterSk: () => "META" as const,
  /** Lookup pointer: ORDERNUM#OC10001 → orderId (UUID). */
  numberPk: (orderNumber: string) => `ORDERNUM#${orderNumber.trim().toUpperCase()}`,
  numberSk: () => "META" as const,
};

// ---- carts table ----
export const cartKeys = {
  pk: (userKey: string) => `CART#${userKey}`,
  sk: () => "META" as const,
  // GSI1: scan recently-updated carts for abandoned-cart recovery
  gsi1pk: () => "ENTITY#CART" as const,
  gsi1sk: (updatedAt: string) => updatedAt,
};

// ---- customers table (session identity + lead events) ----
export const customerKeys = {
  pk: (sessionId: string) => `SESSION#${sessionId}`,
  profileSk: () => "PROFILE" as const,
  leadSk: (timestamp: string) => `LEAD#${timestamp}`,
  // GSI1: admin lead feed by date
  gsi1pk: () => "ENTITY#LEAD" as const,
  gsi1sk: (timestamp: string) => timestamp,
};

// ---- customers table (registered user account data) ----
export const accountKeys = {
  pk: (userId: string) => `USER#${userId}`,
  profileSk: () => "PROFILE" as const,
  addressSk: (addressId: string) => `ADDRESS#${addressId}`,
  addressSkPrefix: () => "ADDRESS#" as const,
};

// ---- events table (analytics) ----
export const eventKeys = {
  // per-session timeline
  pk: (sessionId: string) => `SESSION#${sessionId}`,
  sk: (timestamp: string, eventId: string) => `${timestamp}#${eventId}`,
  // GSI1: feed of one event type per day
  gsi1pk: (type: string, day: string) => `${type}#${day}`,
  gsi1sk: (timestamp: string) => timestamp,
  // daily rollup counters (kept long-term)
  rollupPk: (day: string) => `ROLLUP#${day}`,
  rollupSk: (metric: string) => metric,
  /**
   * Live presence partition — Query PK=PRESENCE#LIVE for active visitors.
   * Items carry DynamoDB TTL (`expiresAt`) so idle sessions drop off automatically.
   */
  presencePk: () => "PRESENCE#LIVE" as const,
  presenceSk: (sessionId: string) => `SESSION#${sessionId}`,
};

// ---- config table ----
export const configKeys = {
  payments: { pk: "CONFIG#PAYMENTS", sk: "META" as const },
  blogImages: { pk: "CONFIG#BLOG_IMAGES", sk: "META" as const },
  shipping: { pk: "CONFIG#SHIPPING", sk: "META" as const },
  cjDropshipping: { pk: "CONFIG#CJ_DROPSHIPPING", sk: "META" as const },
  eprolo: { pk: "CONFIG#EPROLO", sk: "META" as const },
  homepageRanking: { pk: "CONFIG#HOMEPAGE_RANKING", sk: "META" as const },
  homepageSnapshot: { pk: "CONFIG#HOMEPAGE_SNAPSHOT", sk: "META" as const },
  chat: { pk: "CONFIG#CHAT", sk: "META" as const },
};

/** Admin CJ catalog import jobs (config table). */
export const cjImportJobKeys = {
  pk: (jobId: string) => `CJ_IMPORT#${jobId}`,
  sk: () => "META" as const,
  listPk: () => "ENTITY#CJ_IMPORT" as const,
  listSk: (createdAt: string, jobId: string) => `${createdAt}#${jobId}`,
};

/** Lookup so we skip a CJ pid that is already on the store. */
export const cjPidKeys = {
  pk: (pid: string) => `CJPID#${pid}`,
  sk: () => "META" as const,
};

/** Multi-warehouse / multi-vendor registry (config table). */
export const warehouseKeys = {
  pk: (warehouseId: string) => `WAREHOUSE#${warehouseId}`,
  sk: () => "META" as const,
  pkPrefix: () => "WAREHOUSE#" as const,
};

export const vendorRecordKeys = {
  pk: (vendorId: string) => `VENDOR#${vendorId}`,
  sk: () => "META" as const,
  pkPrefix: () => "VENDOR#" as const,
};

export const marketKeys = {
  pk: (countryCode: string) => `MARKET#${countryCode.trim().toUpperCase()}`,
  sk: () => "META" as const,
  pkPrefix: () => "MARKET#" as const,
};

export const inventoryListingKeys = {
  pk: (listingId: string) => `INVLIST#${listingId}`,
  sk: () => "META" as const,
  pkPrefix: () => "INVLIST#" as const,
};

export const auditLogKeys = {
  pk: (auditId: string) => `AUDIT#${auditId}`,
  sk: () => "META" as const,
  pkPrefix: () => "AUDIT#" as const,
};

/** Tracks admin S3 uploads → product slug for recovery if DB is reset. */
export const uploadRegistryKeys = {
  pk: (storageKey: string) => `UPLOAD#${storageKey.replace(/^\/+/, "")}`,
  sk: () => "META" as const,
};

export const couponKeys = {
  pk: (code: string) => `COUPON#${code.trim().toUpperCase()}`,
  sk: () => "META" as const,
  welcomeEmailPk: (email: string) => `WELCOME#${email.trim().toLowerCase()}`,
  welcomeEmailSk: () => "ACTIVE" as const,
  /** One-spin-per-day index keyed by normalized phone digits. */
  welcomePhonePk: (phoneDigits: string) => `WELCOMEPHONE#${phoneDigits}`,
  welcomePhoneSk: () => "ACTIVE" as const,
  abandonedEmailPk: (email: string) => `ABANDONED#${email.trim().toLowerCase()}`,
  abandonedEmailSk: () => "ACTIVE" as const,
};

/** Business expenses (config table). */
export const expenseKeys = {
  pk: (expenseId: string) => `EXPENSE#${expenseId}`,
  sk: () => "META" as const,
  pkPrefix: () => "EXPENSE#" as const,
};

/** Manual payment-gateway ledger entries (config table). */
export const paymentLedgerKeys = {
  pk: (paymentId: string) => `PAYLEDGER#${paymentId}`,
  sk: () => "META" as const,
  pkPrefix: () => "PAYLEDGER#" as const,
};

/** Vendor payout ledger entries (config table) — amounts paid to fulfill vendors. */
export const vendorPayoutKeys = {
  pk: (payoutId: string) => `VENDORPAY#${payoutId}`,
  sk: () => "META" as const,
  pkPrefix: () => "VENDORPAY#" as const,
};

// ---- email campaigns table (SES bulk marketing) ----
export const sesEmailKeys = {
  campaignPk: (campaignId: string) => `CAMPAIGN#${campaignId}`,
  campaignSk: () => "META" as const,
  recipientSk: (email: string) => `RECIPIENT#${email.trim().toLowerCase()}`,
  queueSk: (email: string) => `QUEUE#${email.trim().toLowerCase()}`,
  /** GSI1: list campaigns by createdAt */
  entityCampaignPk: () => "ENTITY#CAMPAIGN" as const,
  entityCampaignSk: (createdAt: string) => createdAt,
  /** GSI2: find due/scheduled campaigns */
  statusPk: (status: string) => `STATUS#${status}`,
  statusSk: (at: string) => at,
  /** Pending queue scan for worker */
  pendingQueuePk: () => "QUEUE#PENDING" as const,
  pendingQueueSk: (campaignId: string, email: string) => `${campaignId}#${email.trim().toLowerCase()}`,
  templatePk: (templateId: string) => `TEMPLATE#${templateId}`,
  templateSk: () => "META" as const,
  entityTemplatePk: () => "ENTITY#TEMPLATE" as const,
  entityTemplateSk: (createdAt: string) => createdAt,
  suppressPk: (email: string) => `SUPPRESS#${email.trim().toLowerCase()}`,
  suppressSk: () => "META" as const,
  entitySuppressPk: () => "ENTITY#SUPPRESS" as const,
  entitySuppressSk: (createdAt: string) => createdAt,
  /** Pending bounce events from Mailercloud webhook (processed by bounce-sync Lambda). */
  bounceEventPk: (id: string) => `BOUNCEEVT#${id}`,
  bounceEventSk: () => "META" as const,
  pendingBouncePk: () => "BOUNCE#PENDING" as const,
  pendingBounceSk: (createdAt: string, email: string) =>
    `${createdAt}#${email.trim().toLowerCase()}`,
  settingsPk: () => "SETTINGS#SES" as const,
  settingsSk: () => "META" as const,
  trackOpenPk: (token: string) => `TRACKOPEN#${token}`,
  trackClickPk: (token: string) => `TRACKCLICK#${token}`,
  trackSk: () => "META" as const,
  notifyPk: (id: string) => `NOTIFY#${id}`,
  notifySk: () => "META" as const,
  entityNotifyPk: () => "ENTITY#NOTIFY" as const,
  entityNotifySk: (createdAt: string) => createdAt,
  dailyCounterPk: (day: string) => `DAILY#${day}`,
  dailyCounterSk: () => "META" as const,
};

// ---- reminder emails table (checkout nudges for non-buyers) ----
export const reminderEmailKeys = {
  pk: (email: string) => `EMAIL#${email.trim().toLowerCase()}`,
  sk: () => "META" as const,
  /** GSI1: list by status (show | deleted) */
  statusPk: (status: "show" | "deleted") => `STATUS#${status}`,
  statusSk: (createdAt: string, email: string) => `${createdAt}#${email.trim().toLowerCase()}`,
};

/** Pending-payment reminder unsubscribe list (dedicated table). */
export const pendingPaymentUnsubKeys = {
  pk: (email: string) => `EMAIL#${email.trim().toLowerCase()}`,
  sk: () => "META" as const,
};

export const spiceKeys = {
  pk: (slug: string) => `SPICE#${slug}`,
  sk: () => "META" as const,
  aliasSk: (alias: string) => `ALIAS#${alias.toLowerCase()}`,
  priceSk: (priceDate: string, market: string, grade: string) =>
    `PRICE#${priceDate}#${market}#${grade}`,
  gsi1pk: () => "ENTITY#SPICE" as const,
  gsi1sk: (slug: string) => slug,
};

export const wholesaleQuoteKeys = {
  pk: (quoteId: string) => `QUOTE#${quoteId}`,
  sk: () => "META" as const,
  gsi1pk: () => "ENTITY#WHOLESALE_QUOTE" as const,
  gsi1sk: (createdAt: string) => createdAt,
};

export const mandiPriceKeys = {
  pk: (commoditySlug: string) => `COMMODITY#${commoditySlug}`,
  historySk: (isoDate: string, market: string) => `DATE#${isoDate}#MARKET#${market}`,
  latestSk: () => "LATEST" as const,
  fetchHealthSk: () => "FETCH_HEALTH" as const,
};

export const fxRateKeys = {
  pk: () => "FX#INR" as const,
  latestSk: () => "LATEST" as const,
};

export const bulkPricingKeys = {
  spicePk: (spiceId: string) => `SPICE#${spiceId}`,
  spiceSk: () => "META" as const,
  addOnsPk: () => "CONFIG#ADDONS" as const,
  addOnsSk: () => "META" as const,
};

export const bulkEnquiryKeys = {
  pk: (enquiryId: string) => `ENQUIRY#${enquiryId}`,
  sk: () => "META" as const,
  gsi1pk: (status: string) => `STATUS#${status}`,
  gsi1sk: (createdAt: string) => createdAt,
};

export const shippingConfigKeys = {
  pk: () => "CONFIG#SHIPPING" as const,
  sk: () => "META" as const,
};

/**
 * Legacy single-table helpers — retained only for the one-time migration script
 * that reads the old `spicycorner-{env}` table. Do not use in handlers.
 */
export const legacyKeys = {
  userPk: (userId: string) => `USER#${userId}`,
  orderSkPrefix: () => "ORDER#",
};
