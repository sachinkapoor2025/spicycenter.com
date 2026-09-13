import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ORDER_STATUS } from "../constants";
import {
  PENDING_PAYMENT_REMINDER_END_DATE,
  calendarDateKeyNy,
  isPendingPaymentReminderCampaignActive,
  shouldSendPendingPaymentReminder,
} from "./pending-payment-reminder";

describe("pending-payment-reminder", () => {
  it("campaign active through end date inclusive", () => {
    assert.equal(
      isPendingPaymentReminderCampaignActive(new Date("2026-08-28T12:00:00-04:00")),
      true
    );
    assert.equal(
      isPendingPaymentReminderCampaignActive(new Date("2026-08-29T01:00:00-04:00")),
      false
    );
    assert.equal(PENDING_PAYMENT_REMINDER_END_DATE, "2026-08-28");
  });

  it("sends once per NY calendar day for pending_payment orders", () => {
    const now = new Date("2026-07-20T15:00:00-04:00");
    const base = {
      status: ORDER_STATUS.PENDING_PAYMENT,
      createdAt: "2026-07-19T10:00:00.000Z",
      shippingAddress: {
        name: "Test",
        email: "sister@example.com",
        phone: "+1 408 555 0100",
        line1: "1 Main",
        city: "NYC",
        state: "NY",
        postalCode: "10001",
        country: "US",
      },
    };

    assert.equal(shouldSendPendingPaymentReminder(base, now), true);
    assert.equal(
      shouldSendPendingPaymentReminder(
        { ...base, pendingPaymentReminderLastDateKey: "2026-07-20" },
        now
      ),
      false
    );
    assert.equal(
      shouldSendPendingPaymentReminder(
        { ...base, pendingPaymentReminderLastDateKey: "2026-07-19" },
        now
      ),
      true
    );
    assert.equal(
      shouldSendPendingPaymentReminder({ ...base, status: ORDER_STATUS.PAID }, now),
      false
    );
  });

  it("calendarDateKeyNy returns YYYY-MM-DD", () => {
    assert.equal(calendarDateKeyNy(new Date("2026-08-28T23:30:00-04:00")), "2026-08-28");
  });
});
