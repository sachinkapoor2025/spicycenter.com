import { UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { eventKeys } from "@spicycorner/shared";
import { docClient, EVENTS_TABLE, now } from "./db";

/** Atomically increment counters on a daily rollup item. */
export async function incrementRollup(
  day: string,
  metric: string,
  kind: string,
  label: string,
  fields: Record<string, number>
) {
  const names: Record<string, string> = { "#kind": "kind", "#lbl": "label" };
  const values: Record<string, unknown> = { ":kind": kind, ":lbl": label, ":now": now() };
  const addParts: string[] = [];
  let i = 0;
  for (const [field, delta] of Object.entries(fields)) {
    if (!Number.isFinite(delta) || delta === 0) continue;
    const nameKey = `#f${i}`;
    const valKey = `:d${i}`;
    names[nameKey] = field;
    values[valKey] = delta;
    addParts.push(`${nameKey} ${valKey}`);
    i++;
  }
  if (!addParts.length) return;

  await docClient.send(
    new UpdateCommand({
      TableName: EVENTS_TABLE,
      Key: { PK: eventKeys.rollupPk(day), SK: eventKeys.rollupSk(metric) },
      UpdateExpression:
        "SET #kind = if_not_exists(#kind, :kind), #lbl = if_not_exists(#lbl, :lbl), updatedAt = :now ADD " +
        addParts.join(", "),
      ExpressionAttributeNames: names,
      ExpressionAttributeValues: values,
    })
  );
}

export function geoRollupKeys(slug: string, country?: string, region?: string, city?: string) {
  const cc = (country ?? "").trim().toUpperCase().slice(0, 2);
  const reg = (region ?? "").trim().slice(0, 80);
  const loc = (city ?? "").trim().slice(0, 80);
  const keys: { metric: string; kind: string; label: string }[] = [];
  if (!slug || !cc) return keys;
  keys.push({ metric: `PRODUCTGEO#${slug}#${cc}`, kind: "product_geo", label: `${slug}|${cc}` });
  if (reg) {
    keys.push({
      metric: `PRODUCTGEO#${slug}#${cc}#${reg}`,
      kind: "product_geo_region",
      label: `${slug}|${cc}|${reg}`,
    });
  }
  if (reg && loc) {
    keys.push({
      metric: `PRODUCTGEO#${slug}#${cc}#${reg}#${loc}`,
      kind: "product_geo_city",
      label: `${slug}|${cc}|${reg}|${loc}`,
    });
  }
  return keys;
}
