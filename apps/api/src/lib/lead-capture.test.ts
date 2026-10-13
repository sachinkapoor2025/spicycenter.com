import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2, APIGatewayProxyStructuredResultV2 } from "aws-lambda";
import { LEAD_CAPTURE_MAX_BODY_BYTES } from "@spicycorner/shared";
import { captureLead } from "../handlers/orders";

function httpResult(res: APIGatewayProxyResultV2): APIGatewayProxyStructuredResultV2 {
  if (!res || typeof res === "string" || !("statusCode" in res)) {
    throw new Error("expected structured API Gateway result");
  }
  return res;
}

function event(body: unknown): APIGatewayProxyEventV2 {
  return { body: typeof body === "string" ? body : JSON.stringify(body) } as APIGatewayProxyEventV2;
}

describe("captureLead catalogue enquiry contract", () => {
  it("rejects oversized bodies before persist", async () => {
    const res = httpResult(await captureLead(event("x".repeat(LEAD_CAPTURE_MAX_BODY_BYTES + 1))));
    assert.equal(res.statusCode, 400);
    assert.match(String(res.body), /Payload too large/);
  });

  it("rejects malformed productsJson without creating a lead", async () => {
    const res = httpResult(
      await captureLead(
        event({
          sessionId: "sess-1",
          source: "catalogue-enquiry",
          metadata: {
            market: "india",
            kind: "commercial-order",
            state: "Punjab",
            city: "Ferozepur",
            productsJson: "{not json",
          },
        })
      )
    );
    assert.equal(res.statusCode, 400);
    assert.match(String(res.body), /Invalid products payload/);
  });

  it("returns 400 for malformed JSON and does not throw", async () => {
    const res = httpResult(await captureLead(event("{not json")));
    assert.equal(res.statusCode, 400);
    assert.match(String(res.body), /Invalid JSON/);
    assert.doesNotMatch(String(res.body), /leadId/);
  });

  it("returns 400 for truncated JSON without persisting a lead", async () => {
    const res = httpResult(
      await captureLead(
        event('{"sessionId":"sess-1","source":"catalogue-enquiry","email":')
      )
    );
    assert.equal(res.statusCode, 400);
    const payload = JSON.parse(String(res.body)) as { error?: string; leadId?: string };
    assert.equal(payload.error, "Invalid JSON");
    assert.equal(payload.leadId, undefined);
  });

  it("rejects structured enquiries that fail Stage 1 validation", async () => {
    const res = httpResult(
      await captureLead(
        event({
          sessionId: "sess-1",
          source: "catalogue-enquiry",
          metadata: {
            kind: "commercial-order",
            productsJson: JSON.stringify([{ name: "Cumin whole", quantity: "25", unit: "kg" }]),
          },
        })
      )
    );
    assert.equal(res.statusCode, 400);
    assert.match(String(res.body), /Within India or Overseas/);
  });
});
