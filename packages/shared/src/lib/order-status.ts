import { ORDER_STATUS } from "../constants";

/** Statuses that mean payment succeeded (order is past checkout). */
const PAYMENT_SETTLED_STATUSES = new Set<string>([
  ORDER_STATUS.PAID,
  ORDER_STATUS.ACCEPTED,
  ORDER_STATUS.ON_HOLD,
  ORDER_STATUS.PROCESSING,
  ORDER_STATUS.SHIPPED,
  ORDER_STATUS.DELIVERED,
  ORDER_STATUS.COMPLETE,
  ORDER_STATUS.REFUNDED,
]);

/** True when the customer has paid — includes shipped / delivered / complete, not only `paid`. */
export function isOrderPaymentSettled(status: string): boolean {
  return PAYMENT_SETTLED_STATUSES.has(status);
}

/** True when the customer still needs to complete checkout payment. */
export function isOrderAwaitingPayment(status: string): boolean {
  return status === ORDER_STATUS.PENDING_PAYMENT;
}

/** Human-readable customer-facing status label. */
export function formatOrderStatusLabel(status: string): string {
  if (status === ORDER_STATUS.ACCEPTED) return "Order Confirmed";
  return status.replace(/_/g, " ");
}

/** Short customer headline for the order confirmation page. */
export function orderConfirmationHeadline(status: string): string {
  switch (status) {
    case ORDER_STATUS.SHIPPED:
      return "Your order has shipped!";
    case ORDER_STATUS.DELIVERED:
      return "Your order was delivered!";
    case ORDER_STATUS.COMPLETE:
      return "Your order is complete!";
    case ORDER_STATUS.ACCEPTED:
      return "Your order is confirmed!";
    case ORDER_STATUS.PROCESSING:
      return "Your order is being prepared!";
    case ORDER_STATUS.ON_HOLD:
      return "Your order is on hold";
    case ORDER_STATUS.REFUNDED:
      return "This order was refunded";
    case ORDER_STATUS.CANCELLED:
      return "This order was cancelled";
    case ORDER_STATUS.PENDING_PAYMENT:
      return "Awaiting payment";
    case ORDER_STATUS.PAID:
    default:
      return isOrderPaymentSettled(status)
        ? "Thank you — your order is confirmed!"
        : "Awaiting payment";
  }
}

/** Supporting copy under the confirmation headline. */
export function orderConfirmationSubcopy(status: string): string {
  switch (status) {
    case ORDER_STATUS.SHIPPED:
      return "Your spice order is on the way. Use the tracking details below to follow your shipment.";
    case ORDER_STATUS.DELIVERED:
      return "Your gift has arrived. We hope your brother loves it — thank you for choosing SpicyCenter.";
    case ORDER_STATUS.COMPLETE:
      return "Thank you for shopping spice with SpicyCenter.";
    case ORDER_STATUS.ACCEPTED:
      return "We've confirmed your order and our team is preparing it for USA dispatch.";
    case ORDER_STATUS.PROCESSING:
      return "We've received your payment and our team is preparing your order for USA dispatch.";
    case ORDER_STATUS.ON_HOLD:
      return "Our team is reviewing your order. We'll email you with an update shortly.";
    case ORDER_STATUS.REFUNDED:
      return "A refund has been issued for this order. Contact support if you have questions.";
    case ORDER_STATUS.CANCELLED:
      return "This order was cancelled. You can place a new order anytime.";
    case ORDER_STATUS.PENDING_PAYMENT:
      return "Complete payment to confirm your order. Delivering in 5–7 days.";
    default:
      return isOrderPaymentSettled(status)
        ? "Your spice order is on its way. We've sent a confirmation email and our team will dispatch your order soon."
        : "Complete payment to confirm your order. Delivering in 5–7 days.";
  }
}
