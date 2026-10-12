import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { collectLeadPage, decodeLeadCursor, encodeLeadCursor, leadItemCursor } from "./lead-list";

function item(id: string, source: string): Record<string, unknown> {
  return {
    PK: `SESSION#${id}`,
    SK: `LEAD#${id}`,
    GSI1PK: "ENTITY#LEAD",
    GSI1SK: id,
    leadId: id,
    source,
  };
}

describe("lead cursors", () => {
  it("round-trips a Dynamo key", () => {
    const key = { PK: "SESSION#a", SK: "LEAD#t", GSI1PK: "ENTITY#LEAD", GSI1SK: "t" };
    assert.deepEqual(decodeLeadCursor(encodeLeadCursor(key)), key);
    assert.equal(decodeLeadCursor("not-base64"), undefined);
  });
});

describe("collectLeadPage", () => {
  it("saves the cursor of the last collected match, not the dynamo page tail", async () => {
    const dynamoPages = [
      {
        items: [item("1", "contact"), item("2", "catalogue-enquiry"), item("3", "catalogue-enquiry")],
        lastKey: leadItemCursor(item("3", "catalogue-enquiry")),
      },
    ];
    const page = await collectLeadPage(async () => dynamoPages.shift() ?? { items: [] }, {
      limit: 1,
      match: (row) => row.source === "catalogue-enquiry",
    });
    assert.equal(page.items.length, 1);
    assert.equal(page.items[0]?.leadId, "2");
    assert.deepEqual(page.nextKey, leadItemCursor(item("2", "catalogue-enquiry")));
  });

  it("does not invent a second page of keys when the index is exhausted", async () => {
    const page = await collectLeadPage(
      async () => ({ items: [item("1", "catalogue-enquiry")], lastKey: undefined }),
      { limit: 25, match: () => true }
    );
    assert.equal(page.exhausted, true);
    assert.equal(page.nextKey, undefined);
    assert.equal(page.items.length, 1);
  });
});
