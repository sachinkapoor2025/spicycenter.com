import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  parseSettlementAmount,
  parseSettlementDate,
  parseSettlementRows,
} from "./settlement-import";

describe("parseSettlementDate", () => {
  it("parses ISO and Excel-like day-first dates", () => {
    assert.equal(parseSettlementDate("2026-08-07", true), "2026-08-07");
    assert.equal(parseSettlementDate("07/08/2026", true), "2026-08-07");
    assert.equal(parseSettlementDate("08/07/2026", false), "2026-08-07");
  });
});

describe("parseSettlementAmount", () => {
  it("strips currency and skips negatives", () => {
    assert.equal(parseSettlementAmount("$1,234.50"), 1234.5);
    assert.equal(parseSettlementAmount("₹4,686.00"), 4686);
    assert.equal(parseSettlementAmount("(100.00)"), null);
  });
});

describe("parseSettlementRows", () => {
  it("maps Razorpay-style headers and detects duplicates in file", () => {
    const result = parseSettlementRows(
      [
        { "Settlement Date": "2026-08-07", "Amount Settled": "4686", Fee: "50" },
        { "Settlement Date": "2026-08-07", "Amount Settled": "4686", Fee: "50" },
        { "Settlement Date": "2026-08-06", "Amount Settled": "1200.25" },
      ],
      "razorpay"
    );
    assert.equal(result.rows.length, 2);
    assert.equal(result.rows[0]!.amount, 4686);
    assert.equal(result.rows[0]!.gatewayFee, 50);
    assert.equal(result.rows[1]!.receivedDate, "2026-08-06");
    assert.ok(result.skipped.some((s) => /Duplicate row/i.test(s.reason)));
  });
});
