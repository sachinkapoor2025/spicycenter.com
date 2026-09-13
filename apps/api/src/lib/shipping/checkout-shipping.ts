import { GetCommand } from "@aws-sdk/lib-dynamodb";
import {
  BELOW_THRESHOLD_SHIPPING_USD,
  DEFAULT_PACKAGE,
  DEFAULT_USD_INR_RATE,
  estimatePackageFromItems,
  FREE_SHIPPING_MIN_SUBTOTAL_USD,
  quoteFreeShippingThreshold,
  selectRate,
  USPS_MAIL_CLASSES,
  type RateQuote,
  type ShippingSettings,
  type ShopCurrency,
} from "@spicycorner/shared";
import { productKeys, type Product } from "@spicycorner/shared";
import { docClient, PRODUCTS_TABLE } from "../db";
import { getShippingProvider, loadShippingSettings } from "./index";
import { isLoadTestMode } from "../load-test";

export interface ShippingQuoteResult {
  rates: RateQuote[];
  selected?: RateQuote;
  customerShippingCharge: number;
  estimatedLabelCost?: number;
  fallbackUsed?: boolean;
  warning?: string;
  labelStatus?: "none" | "queued";
  settingsSnapshot: {
    mode: "free" | "pass_through";
    festivalActive?: string;
    freeShipping?: {
      qualifies: boolean;
      thresholdUsd: number;
      belowThresholdFeeUsd: number;
      amountAway: number;
    };
  };
  packageDetails: typeof DEFAULT_PACKAGE;
}

function activeFestivalName(settings: ShippingSettings): string | undefined {
  const today = new Date().toISOString().slice(0, 10);
  return settings.festivalModeRanges.find(
    (r) => today >= r.startDate && today <= r.endDate
  )?.name;
}

export async function fetchProductDims(
  productSlug: string
): Promise<Pick<Product, "weightOz" | "lengthIn" | "widthIn" | "heightIn">> {
  const result = await docClient.send(
    new GetCommand({
      TableName: PRODUCTS_TABLE,
      Key: { PK: productKeys.pk(productSlug), SK: productKeys.sk() },
    })
  );
  const product = result.Item as Product | undefined;
  return {
    weightOz: product?.weightOz,
    lengthIn: product?.lengthIn,
    widthIn: product?.widthIn,
    heightIn: product?.heightIn,
  };
}

export async function estimatePackageForCartItems(
  items: Array<{ productSlug: string; quantity: number }>
): Promise<ReturnType<typeof estimatePackageFromItems>> {
  const dims = await Promise.all(
    items.map(async (item) => ({
      ...(await fetchProductDims(item.productSlug)),
      quantity: item.quantity,
    }))
  );
  return estimatePackageFromItems(dims);
}

export interface ResolveShippingInput {
  destination: {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  cartItems: Array<{ productSlug: string; quantity: number }>;
  /** Pre-discount cart subtotal in `currency` — drives free-shipping threshold. */
  subtotal?: number;
  currency?: ShopCurrency;
  usdInrRate?: number;
  shippingServiceCode?: string;
  shippingRateId?: string;
  settings?: ShippingSettings;
}

function freeModeCustomerCharge(input: ResolveShippingInput): {
  charge: number;
  freeShipping?: ShippingQuoteResult["settingsSnapshot"]["freeShipping"];
} {
  if (input.subtotal == null || !Number.isFinite(input.subtotal)) {
    return { charge: 0 };
  }
  const currency = input.currency ?? "USD";
  const usdInrRate = input.usdInrRate ?? DEFAULT_USD_INR_RATE;
  const quote = quoteFreeShippingThreshold({
    subtotal: input.subtotal,
    currency,
    usdInrRate,
  });
  return {
    charge: quote.charge,
    freeShipping: {
      qualifies: quote.qualifiesForFreeShipping,
      thresholdUsd: FREE_SHIPPING_MIN_SUBTOTAL_USD,
      belowThresholdFeeUsd: BELOW_THRESHOLD_SHIPPING_USD,
      amountAway: quote.amountAwayFromFreeShipping,
    },
  };
}

function resolveCustomerCharge(
  settings: ShippingSettings,
  input: ResolveShippingInput,
  passThroughCharge: number
): {
  charge: number;
  freeShipping?: ShippingQuoteResult["settingsSnapshot"]["freeShipping"];
} {
  if (settings.customerShippingMode === "pass_through") {
    return { charge: passThroughCharge };
  }
  return freeModeCustomerCharge(input);
}

export async function resolveShippingForCheckout(
  input: ResolveShippingInput
): Promise<ShippingQuoteResult> {
  const settings = input.settings ?? (await loadShippingSettings());
  const origin = settings.originAddress;
  const pkg = await estimatePackageForCartItems(input.cartItems);
  const festivalActive = activeFestivalName(settings);

  if (isLoadTestMode()) {
    const fake: RateQuote = {
      rateId: "LOADTEST|USPS_GROUND_ADVANTAGE|0.00|",
      mailClass: "USPS_GROUND_ADVANTAGE",
      serviceName: "USPS Ground Advantage (load-test)",
      price: 0,
      currency: "USD",
      estimatedDeliveryDate: new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 10),
    };
    const { charge, freeShipping } = resolveCustomerCharge(settings, input, 0);
    return {
      rates: [fake],
      selected: fake,
      customerShippingCharge: charge,
      estimatedLabelCost: 0,
      settingsSnapshot: {
        mode: settings.customerShippingMode,
        festivalActive,
        freeShipping,
      },
      packageDetails: pkg,
      labelStatus: "queued",
      warning: "LOAD_TEST_MODE: USPS skipped",
    };
  }

  if (!origin.line1 || !origin.postalCode) {
    const { charge, freeShipping } = resolveCustomerCharge(settings, input, settings.flatRateFallbackUsd);
    return {
      rates: [],
      customerShippingCharge: charge,
      warning: "Shipping origin address not configured in admin settings",
      labelStatus: "queued",
      settingsSnapshot: {
        mode: settings.customerShippingMode,
        freeShipping,
      },
      packageDetails: DEFAULT_PACKAGE,
    };
  }

  const destination = {
    name: "Customer",
    ...input.destination,
  };

  let rates: RateQuote[] = [];
  let warning: string | undefined;
  let fallbackUsed = false;

  try {
    const provider = await getShippingProvider(settings);
    rates = await provider.getRates(pkg, origin, destination);
  } catch (err) {
    warning = err instanceof Error ? err.message : "USPS rate lookup failed";
    if (settings.customerShippingMode === "pass_through") {
      fallbackUsed = true;
      return {
        rates: [],
        customerShippingCharge: settings.flatRateFallbackUsd,
        fallbackUsed,
        warning,
        labelStatus: "queued",
        settingsSnapshot: {
          mode: settings.customerShippingMode,
          festivalActive,
        },
        packageDetails: pkg,
      };
    }
    const { charge, freeShipping } = freeModeCustomerCharge(input);
    return {
      rates: [],
      customerShippingCharge: charge,
      warning,
      labelStatus: "queued",
      settingsSnapshot: {
        mode: settings.customerShippingMode,
        festivalActive,
        freeShipping,
      },
      packageDetails: pkg,
    };
  }

  let selected = selectRate(rates, settings);

  if (input.shippingRateId) {
    const override = rates.find((r) => r.rateId === input.shippingRateId);
    if (override) selected = override;
    else warning = (warning ? `${warning}; ` : "") + "Requested shippingRateId not in rate list";
  } else if (input.shippingServiceCode) {
    const override = rates.find((r) => r.mailClass === input.shippingServiceCode);
    if (override) selected = override;
    else warning = (warning ? `${warning}; ` : "") + "Requested shippingServiceCode not in rate list";
  }

  const estimatedLabelCost = selected?.price;
  let passThroughCharge = 0;
  if (settings.customerShippingMode === "pass_through") {
    passThroughCharge = selected?.price ?? settings.flatRateFallbackUsd;
    if (!selected) fallbackUsed = true;
  }
  const { charge: customerShippingCharge, freeShipping } = resolveCustomerCharge(
    settings,
    input,
    passThroughCharge
  );

  return {
    rates,
    selected,
    customerShippingCharge,
    estimatedLabelCost,
    fallbackUsed,
    warning,
    labelStatus: selected ? undefined : "queued",
    settingsSnapshot: {
      mode: settings.customerShippingMode,
      festivalActive,
      freeShipping,
    },
    packageDetails: pkg,
  };
}

/** True when Admin → Shipping origin is filled enough for USPS rates/labels. */
export function shippingOriginConfigured(settings: ShippingSettings): boolean {
  const o = settings.originAddress;
  return Boolean(
    o.line1?.trim() && o.city?.trim() && o.state?.trim() && o.postalCode?.trim()
  );
}

export function shippingOriginMissingMessage(): string {
  return "USPS origin address is not configured. Open Admin → Shipping and save a complete From address (street, city, state, ZIP), then try again.";
}

export async function purchaseLabelForOrder(order: {
  orderId: string;
  shippingAddress: {
    name: string;
    line1: string;
    line2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    phone?: string;
    email?: string;
  };
  items: Array<{ productSlug: string; quantity: number }>;
  shippingRateId?: string;
  shippingServiceCode?: string;
}): Promise<{
  trackingNumber: string;
  labelPdfUrl?: string;
  labelCost?: number;
  shippingServiceName?: string;
  shippingServiceCode?: string;
}> {
  const settings = await loadShippingSettings();
  if (!shippingOriginConfigured(settings)) {
    throw new Error(shippingOriginMissingMessage());
  }
  const provider = await getShippingProvider(settings);
  const pkg = await estimatePackageForCartItems(order.items);

  // Admin "Buy USPS label" often has no service saved (free-shipping checkout).
  // Default to Ground Advantage so purchase can proceed without a prior Load rates step.
  const mailClass =
    order.shippingServiceCode?.trim() ||
    (order.shippingRateId ? undefined : USPS_MAIL_CLASSES.GROUND_ADVANTAGE);

  const result = await provider.buyLabel({
    rateId: order.shippingRateId,
    mailClass,
    pkg,
    origin: settings.originAddress,
    destination: {
      name: order.shippingAddress.name,
      line1: order.shippingAddress.line1,
      line2: order.shippingAddress.line2,
      city: order.shippingAddress.city,
      state: order.shippingAddress.state,
      postalCode: order.shippingAddress.postalCode,
      country: order.shippingAddress.country,
      phone: order.shippingAddress.phone,
      email: order.shippingAddress.email,
    },
    orderId: order.orderId,
  });

  return {
    trackingNumber: result.trackingNumber,
    labelPdfUrl: result.labelPdfUrl,
    labelCost: result.labelCost,
    shippingServiceName: result.serviceName,
    shippingServiceCode: result.mailClass,
  };
}
