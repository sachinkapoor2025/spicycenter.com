import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2, APIGatewayProxyStructuredResultV2 } from "aws-lambda";
import {
  evaluateLeadRetry,
  leadDynamoKey,
  retryLeadEmail,
  retryLeadNotification,
  retryLockIsActive,
  type LeadRetryDeps,
  type StoredLeadItem,
} from "./lead-retry";
import type { EmailSendResult } from "./email";
import { buildCatalogueEnquiryAdminEmail } from "@spicycorner/shared";

const createdAt = "2026-10-12T08:00:00.000Z";
const catalogueLead: StoredLeadItem = {
  sessionId: "sess-1",
  leadId: "lead-1",
  createdAt,
  name: "Priya Shah",
  email: "buyer@example.com",
  phone: "+447700900123",
  page: "/enquiry",
  source: "catalogue-enquiry",
  notifyEmailStatus: "failed",
  metadata: {
    product: "Cumin whole",
    quantity: "25 kg",
    company: "Spice Import Ltd",
    message: "Need whole cumin.",
  },
};

function jwt(groups: string[]): string {
  const payload = Buffer.from(
    JSON.stringify({ sub: "user-1", email: "admin@spicycenter.com", "cognito:groups": groups })
  ).toString("base64url");
  return `eyJhbGciOiJub25lIn0.${payload}.sig`;
}

function httpResult(res: APIGatewayProxyResultV2): APIGatewayProxyStructuredResultV2 {
  if (!res || typeof res === "string" || !("statusCode" in res)) {
    throw new Error("expected structured API Gateway result");
  }
  return res;
}

function adminEvent(body: unknown, groups: string[] = ["admin"]): APIGatewayProxyEventV2 {
  return {
    headers: { authorization: `Bearer ${jwt(groups)}` },
    body: JSON.stringify(body),
    requestContext: { http: { method: "POST", path: "/admin/leads/retry-email" } },
  } as unknown as APIGatewayProxyEventV2;
}

function trackingDeps(item: StoredLeadItem | undefined, notify: () => Promise<EmailSendResult>) {
  const puts: unknown[] = [];
  const stamps: Array<{ PK: string; SK: string; status: string }> = [];
  const deps: LeadRetryDeps & { puts: unknown[] } = {
    puts,
    nowIso: () => "2026-10-12T08:05:00.000Z",
    async getLead() {
      return item;
    },
    async claimLock() {
      return true;
    },
    async notify() {
      return notify();
    },
    async stamp(key, stamp) {
      stamps.push({ ...key, status: stamp.notifyEmailStatus });
    },
  };
  return { deps, puts, stamps };
}

describe("lead Dynamo key", () => {
  it("uses SESSION#sessionId and LEAD#createdAt", () => {
    assert.deepEqual(leadDynamoKey("sess-1", createdAt), {
      PK: "SESSION#sess-1",
      SK: `LEAD#${createdAt}`,
    });
  });
});

describe("evaluateLeadRetry", () => {
  it("returns not_found when the lead is missing", () => {
    assert.equal(evaluateLeadRetry(undefined, createdAt).result, "not_found");
  });

  it("returns already_sent when notifyEmailStatus is sent", () => {
    const result = evaluateLeadRetry({ ...catalogueLead, notifyEmailStatus: "sent" }, createdAt);
    assert.equal(result.result, "already_sent");
  });

  it("returns not_applicable for a silent product capture", () => {
    const result = evaluateLeadRetry(
      { sessionId: "s", source: "product", name: "A", createdAt },
      createdAt
    );
    assert.equal(result.result, "not_applicable");
  });

  it("returns ready when notify status is missing but the payload is retryable", () => {
    const { notifyEmailStatus: _omit, ...unstamped } = catalogueLead;
    const result = evaluateLeadRetry(unstamped, createdAt);
    assert.equal(result.result, "ready");
  });
});

describe("retryLockIsActive", () => {
  it("treats a fresh lock as active and a stale lock as expired", () => {
    assert.equal(retryLockIsActive("2026-10-12T08:04:30.000Z", "2026-10-12T08:05:00.000Z"), true);
    assert.equal(retryLockIsActive("2026-10-12T08:00:00.000Z", "2026-10-12T08:05:00.000Z"), false);
  });
});

describe("retryLeadNotification", () => {
  it("retries an unstamped lead without creating another lead", async () => {
    const { notifyEmailStatus: _omit, ...unstamped } = catalogueLead;
    const { deps, puts, stamps } = trackingDeps(unstamped, async () => ({ ok: true }));
    const outcome = await retryLeadNotification({ sessionId: "sess-1", createdAt }, deps);
    assert.equal(outcome.result, "sent");
    assert.equal(puts.length, 0);
    assert.deepEqual(stamps, [{ PK: "SESSION#sess-1", SK: `LEAD#${createdAt}`, status: "sent" }]);
  });

  it("sends using the existing lead and does not create another lead", async () => {
    const { deps, puts, stamps } = trackingDeps(catalogueLead, async () => ({ ok: true }));
    const outcome = await retryLeadNotification({ sessionId: "sess-1", createdAt }, deps);
    assert.equal(outcome.result, "sent");
    if (outcome.result === "sent") {
      assert.equal(outcome.leadId, "lead-1");
      assert.equal(outcome.stamp.notifyEmailStatus, "sent");
    }
    assert.equal(puts.length, 0);
    assert.deepEqual(stamps, [{ PK: "SESSION#sess-1", SK: `LEAD#${createdAt}`, status: "sent" }]);
  });

  it("retries the stored productsJson payload without creating another lead", async () => {
    const structured: StoredLeadItem = {
      ...catalogueLead,
      metadata: {
        ...catalogueLead.metadata,
        market: "overseas",
        kind: "commercial-order",
        country: "United Arab Emirates",
        city: "Dubai",
        productsJson: JSON.stringify([
          { name: "Cumin whole", quantity: "1", unit: "container" },
          { name: "Turmeric powder", quantity: "10", unit: "kg" },
        ]),
      },
    };
    let notifiedMeta: StoredLeadItem["metadata"];
    const puts: unknown[] = [];
    const deps: LeadRetryDeps = {
      nowIso: () => "2026-10-12T08:05:00.000Z",
      async getLead() {
        return structured;
      },
      async claimLock() {
        return true;
      },
      async notify(lead) {
        notifiedMeta = lead.metadata;
        return { ok: true };
      },
      async stamp() {},
    };
    const outcome = await retryLeadNotification({ sessionId: "sess-1", createdAt }, deps);
    assert.equal(outcome.result, "sent");
    assert.equal(puts.length, 0);
    const mail = buildCatalogueEnquiryAdminEmail({ metadata: notifiedMeta });
    assert.match(mail.text, /Turmeric powder — 10 kg/);
    assert.match(mail.subject, /Commercial Order — Cumin whole \+ 1 more/);
  });

  it("records a failed retry on the same key without a Put", async () => {
    const { deps, puts, stamps } = trackingDeps(catalogueLead, async () => ({
      ok: false,
      error: "SMTP connection failed smtp_pass=secret-value",
    }));
    const outcome = await retryLeadNotification({ sessionId: "sess-1", createdAt }, deps);
    assert.equal(outcome.result, "failed");
    if (outcome.result === "failed") {
      assert.equal(outcome.stamp.notifyEmailStatus, "failed");
      assert.doesNotMatch(outcome.error, /secret-value/);
    }
    assert.equal(puts.length, 0);
    assert.equal(stamps[0]?.SK, `LEAD#${createdAt}`);
  });

  it("returns not_found without notifying", async () => {
    let notified = false;
    const { deps } = trackingDeps(undefined, async () => {
      notified = true;
      return { ok: true };
    });
    const outcome = await retryLeadNotification({ sessionId: "missing", createdAt }, deps);
    assert.equal(outcome.result, "not_found");
    assert.equal(notified, false);
  });

  it("rejects a second concurrent retry via the lock condition", async () => {
    let claimed = false;
    const stamps: string[] = [];
    const deps: LeadRetryDeps = {
      nowIso: () => "2026-10-12T08:05:00.000Z",
      async getLead() {
        return catalogueLead;
      },
      async claimLock() {
        if (claimed) return false;
        claimed = true;
        return true;
      },
      async notify() {
        return { ok: true };
      },
      async stamp(_key, stamp) {
        stamps.push(stamp.notifyEmailStatus);
      },
    };

    const [first, second] = await Promise.all([
      retryLeadNotification({ sessionId: "sess-1", createdAt }, deps),
      retryLeadNotification({ sessionId: "sess-1", createdAt }, deps),
    ]);
    const results = [first.result, second.result].sort();
    assert.deepEqual(results, ["retry_in_progress", "sent"]);
    assert.deepEqual(stamps, ["sent"]);
  });
});

describe("retryLeadEmail authorization", () => {
  const silentDeps: LeadRetryDeps = {
    async getLead() {
      throw new Error("should not load leads without admin auth");
    },
    async claimLock() {
      throw new Error("should not lock");
    },
    async notify() {
      throw new Error("should not notify");
    },
    async stamp() {
      throw new Error("should not stamp");
    },
  };

  it("rejects unauthenticated requests", async () => {
    const event = {
      headers: {},
      body: JSON.stringify({ sessionId: "sess-1", createdAt }),
    } as unknown as APIGatewayProxyEventV2;
    const res = httpResult(await retryLeadEmail(event, silentDeps));
    assert.equal(res.statusCode, 403);
  });

  it("rejects vendor tokens", async () => {
    const res = httpResult(
      await retryLeadEmail(adminEvent({ sessionId: "sess-1", createdAt }, ["vendor"]), silentDeps)
    );
    assert.equal(res.statusCode, 403);
  });

  it("returns 404 for an admin when the lead is missing", async () => {
    const { deps } = trackingDeps(undefined, async () => ({ ok: true }));
    const res = httpResult(await retryLeadEmail(adminEvent({ sessionId: "sess-1", createdAt }), deps));
    assert.equal(res.statusCode, 404);
    const body = JSON.parse(String(res.body));
    assert.equal(body.result, "not_found");
    assert.equal(body.error, "Lead not found");
  });

  it("returns 200 sent after a successful admin retry", async () => {
    const { deps } = trackingDeps(catalogueLead, async () => ({ ok: true }));
    const res = httpResult(await retryLeadEmail(adminEvent({ sessionId: "sess-1", createdAt }), deps));
    assert.equal(res.statusCode, 200);
    const body = JSON.parse(String(res.body));
    assert.equal(body.ok, true);
    assert.equal(body.result, "sent");
    assert.equal(body.leadId, "lead-1");
    assert.equal(body.notifyEmailStatus, "sent");
  });

  it("returns 200 failed without leaking SMTP secrets", async () => {
    const { deps } = trackingDeps(catalogueLead, async () => ({
      ok: false,
      error: "SMTP connection failed smtp_pass=secret-value",
    }));
    const res = httpResult(await retryLeadEmail(adminEvent({ sessionId: "sess-1", createdAt }), deps));
    assert.equal(res.statusCode, 200);
    const body = JSON.parse(String(res.body));
    assert.equal(body.ok, false);
    assert.equal(body.result, "failed");
    assert.equal(body.notifyEmailStatus, "failed");
    assert.doesNotMatch(String(body.error), /secret-value/);
  });

  it("returns 409 when the lead was already notified", async () => {
    const { deps } = trackingDeps(
      { ...catalogueLead, notifyEmailStatus: "sent" },
      async () => ({ ok: true })
    );
    const res = httpResult(await retryLeadEmail(adminEvent({ sessionId: "sess-1", createdAt }), deps));
    assert.equal(res.statusCode, 409);
    const body = JSON.parse(String(res.body));
    assert.equal(body.result, "already_sent");
  });
});
