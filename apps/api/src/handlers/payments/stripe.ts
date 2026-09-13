import Stripe from "stripe";
import type { Order } from "@spicycorner/shared";
import type { APIGatewayProxyEventV2 } from "aws-lambda";
import { ok, badRequest, serverError } from "../../lib/response";
import { markOrderPaid, markOrderPaymentFailed } from "../orders";
import { isLoadTestMode } from "../../lib/load-test";

function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) return null;
  return new Stripe(key, { apiVersion: "2025-02-24.acacia" });
}

function getRawBody(event: APIGatewayProxyEventV2): string {
  if (!event.body) return "";
  if (event.isBase64Encoded) return Buffer.from(event.body, "base64").toString("utf8");
  return event.body;
}

function getHeader(event: APIGatewayProxyEventV2, name: string): string | undefined {
  const headers = event.headers ?? {};
  const lower = name.toLowerCase();
  return headers[lower] ?? headers[name];
}

export async function createStripePaymentIntent(order: Order) {
  if (isLoadTestMode()) {
    return {
      paymentIntentId: `pi_loadtest_${order.orderId}`,
      clientSecret: `pi_loadtest_${order.orderId}_secret`,
    };
  }

  const stripe = getStripe();
  if (!stripe) {
    return {
      paymentIntentId: `pi_dev_${order.orderId}`,
      clientSecret: `pi_dev_${order.orderId}_secret`,
    };
  }

  const intent = await stripe.paymentIntents.create({
    amount: Math.round(order.total * 100),
    currency: order.currency.toLowerCase(),
    metadata: { orderId: order.orderId },
    automatic_payment_methods: { enabled: true },
    ...(order.shippingAddress.email
      ? { receipt_email: order.shippingAddress.email.trim() }
      : {}),
  });

  return {
    paymentIntentId: intent.id,
    clientSecret: intent.client_secret!,
  };
}

export async function stripeWebhook(event: APIGatewayProxyEventV2) {
  const stripe = getStripe();
  if (!stripe) return ok({ received: true, mode: "dev" });

  const sig = getHeader(event, "stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!sig || !webhookSecret) {
    return badRequest("Missing webhook signature");
  }

  const rawBody = getRawBody(event);

  try {
    const stripeEvent = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);

    if (stripeEvent.type === "payment_intent.succeeded") {
      const intent = stripeEvent.data.object as Stripe.PaymentIntent;
      const orderId = intent.metadata?.orderId;
      if (orderId) {
        await markOrderPaid(orderId, { paymentIntentId: intent.id });
      }
    }

    if (stripeEvent.type === "payment_intent.payment_failed") {
      const intent = stripeEvent.data.object as Stripe.PaymentIntent;
      const orderId = intent.metadata?.orderId;
      if (orderId) {
        await markOrderPaymentFailed(orderId, "Stripe payment failed");
      }
    }

    if (stripeEvent.type === "payment_intent.canceled") {
      const intent = stripeEvent.data.object as Stripe.PaymentIntent;
      const orderId = intent.metadata?.orderId;
      if (orderId) {
        await markOrderPaymentFailed(orderId, "Stripe payment cancelled");
      }
    }

    return ok({ received: true });
  } catch (err) {
    console.error("Stripe webhook error:", err);
    return serverError(String(err));
  }
}
