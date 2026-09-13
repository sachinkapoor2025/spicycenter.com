import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  EARLY_BIRD_DISCOUNT_PERCENT,
  EARLY_BIRD_ENDS_DATE,
  SCHEDULE_DELIVERY_MAX_DATE,
  isEarlyBirdPromoActive,
  isValidScheduleDeliveryDate,
  preferredDeliveryDateToIso,
} from "./early-bird";

describe("early bird promo", () => {
  it("is 15% off through Aug 10 2026", () => {
    assert.equal(EARLY_BIRD_DISCOUNT_PERCENT, 15);
    assert.equal(EARLY_BIRD_ENDS_DATE, "2026-08-10");
    assert.equal(isEarlyBirdPromoActive(new Date("2026-08-10T12:00:00-04:00")), true);
    assert.equal(isEarlyBirdPromoActive(new Date("2026-08-11T12:00:00-04:00")), false);
  });

  it("validates schedule delivery through Aug 28", () => {
    assert.equal(SCHEDULE_DELIVERY_MAX_DATE, "2026-08-28");
    const now = new Date("2026-07-30T12:00:00-04:00");
    assert.equal(isValidScheduleDeliveryDate("2026-08-28", now), true);
    assert.equal(isValidScheduleDeliveryDate("2026-08-29", now), false);
    assert.equal(isValidScheduleDeliveryDate("2026-07-29", now), false);
    assert.equal(preferredDeliveryDateToIso("2026-08-15"), "2026-08-15T16:00:00.000Z");
  });
});
