/**
 * In-memory DynamoDB fallback for local dev without Docker.
 * Enable with USE_MEMORY_DB=true.
 *
 * Table-aware: items are namespaced by TableName so the multi-table design
 * behaves correctly. Supports Put/Get/Delete/Query/Scan/Update with the
 * expression patterns this codebase generates (PK/SK + GSI1..3, begins_with,
 * ScanIndexForward, Limit, and SET/ADD update expressions).
 */
import type {
  GetCommandInput,
  PutCommandInput,
  DeleteCommandInput,
  QueryCommandInput,
  ScanCommandInput,
  UpdateCommandInput,
} from "@aws-sdk/lib-dynamodb";

type Item = Record<string, unknown>;

const tables = new Map<string, Map<string, Item>>();

function tableFor(name: string | undefined): Map<string, Item> {
  const key = name ?? "default";
  let t = tables.get(key);
  if (!t) {
    t = new Map();
    tables.set(key, t);
  }
  return t;
}

function itemKey(pk: unknown, sk: unknown): string {
  return `${pk}::${sk}`;
}

function indexAttrs(indexName?: string): { pk: string; sk: string } {
  if (!indexName) return { pk: "PK", sk: "SK" };
  return { pk: `${indexName}PK`, sk: `${indexName}SK` };
}

function matchKeyCondition(
  item: Item,
  indexName: string | undefined,
  keyCondition: string | undefined,
  values: Record<string, unknown> | undefined,
  names: Record<string, string> | undefined
): boolean {
  if (!keyCondition || !values) return true;
  const { pk, sk } = indexAttrs(indexName);
  const resolve = (placeholder: string) => values[placeholder.trim()];

  // partition key: "<pk> = :x"
  const pkMatch = keyCondition.match(/(\w+)\s*=\s*(:\w+)/);
  if (pkMatch) {
    const attr = names?.[pkMatch[1]] ?? pkMatch[1];
    const targetAttr = attr.startsWith("#") || attr === pkMatch[1] ? pk : attr;
    if (item[targetAttr] !== resolve(pkMatch[2])) return false;
  }

  // sort key conditions
  const beginsWith = keyCondition.match(/begins_with\(\s*\w*?(SK)\s*,\s*(:\w+)\s*\)/i);
  if (beginsWith) {
    if (!String(item[sk] ?? "").startsWith(String(resolve(beginsWith[2])))) return false;
  }
  const skEq = keyCondition.match(new RegExp(`${sk}\\s*=\\s*(:\\w+)`));
  if (skEq) {
    if (item[sk] !== resolve(skEq[1])) return false;
  }

  return true;
}

function evalFilter(
  item: Item,
  expression?: string,
  values?: Record<string, unknown>,
  names?: Record<string, string>
): boolean {
  if (!expression) return true;
  const v = values ?? {};
  const n = names ?? {};
  // AND-joined simple clauses
  const clauses = expression.split(/\s+AND\s+/i);
  for (const clause of clauses) {
    const begins = clause.match(/begins_with\(\s*(\w+)\s*,\s*(:\w+)\s*\)/);
    if (begins) {
      const attr = n[begins[1]] ?? begins[1];
      if (!String(item[attr] ?? "").startsWith(String(v[begins[2]]))) return false;
      continue;
    }
    const gt = clause.match(/(#?\w+)\s*>\s*(:\w+)/);
    if (gt) {
      const attr = n[gt[1]] ?? gt[1];
      if (!(Number(item[attr] ?? 0) > Number(v[gt[2]]))) return false;
      continue;
    }
    const eq = clause.match(/(#?\w+)\s*=\s*(:\w+)/);
    if (eq) {
      const attr = n[eq[1]] ?? eq[1];
      if (item[attr] !== v[eq[2]]) return false;
      continue;
    }
  }
  return true;
}

function splitTopLevel(input: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let current = "";
  for (const char of input) {
    if (char === "(") depth++;
    if (char === ")") depth--;
    if (char === "," && depth === 0) {
      parts.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  if (current.trim()) parts.push(current);
  return parts;
}

function applyUpdate(item: Item, input: UpdateCommandInput): Item {
  const updated = { ...item };
  const values = input.ExpressionAttributeValues ?? {};
  const names = input.ExpressionAttributeNames ?? {};
  const expr = input.UpdateExpression ?? "";

  const resolveName = (raw: string) => names[raw.trim()] ?? raw.trim();
  const resolveOperand = (raw: string): unknown => {
    const token = raw.trim();
    if (token.startsWith(":")) return values[token];
    const listAppend = token.match(/^list_append\((.+),(.+)\)$/);
    if (listAppend) {
      const a = resolveOperand(listAppend[1]) as unknown[] | undefined;
      const b = resolveOperand(listAppend[2]) as unknown[] | undefined;
      return [...(a ?? []), ...(b ?? [])];
    }
    const ifNotExists = token.match(/^if_not_exists\((.+),(.+)\)$/);
    if (ifNotExists) {
      const attr = resolveName(ifNotExists[1]);
      return updated[attr] ?? resolveOperand(ifNotExists[2]);
    }
    return updated[resolveName(token)];
  };

  const setMatch = expr.match(/SET\s+(.+?)(?:\s+ADD\s+|\s+REMOVE\s+|$)/is);
  if (setMatch) {
    for (const assignment of splitTopLevel(setMatch[1])) {
      const [lhs, rhs] = assignment.split("=");
      if (!lhs || rhs === undefined) continue;
      updated[resolveName(lhs)] = resolveOperand(rhs);
    }
  }

  const addMatch = expr.match(/ADD\s+(.+?)(?:\s+SET\s+|\s+REMOVE\s+|$)/is);
  if (addMatch) {
    for (const clause of splitTopLevel(addMatch[1])) {
      const tokens = clause.trim().split(/\s+/);
      if (tokens.length < 2) continue;
      const attr = resolveName(tokens[0]);
      const delta = Number(values[tokens[1]] ?? 0);
      updated[attr] = Number(updated[attr] ?? 0) + delta;
    }
  }

  return updated;
}

export const memoryStore = {
  send: async (command: { input: unknown; constructor: { name: string } }) => {
    const name = command.constructor.name;
    const input = command.input as Record<string, unknown> & { TableName?: string };
    const store = tableFor(input.TableName);

    if (name === "PutCommand") {
      const { Item } = input as PutCommandInput;
      if (Item) store.set(itemKey(Item.PK, Item.SK), { ...Item });
      return {};
    }

    if (name === "GetCommand") {
      const { Key } = input as GetCommandInput;
      if (!Key) return { Item: undefined };
      const item = store.get(itemKey(Key.PK, Key.SK));
      return { Item: item ? { ...item } : undefined };
    }

    if (name === "DeleteCommand") {
      const { Key } = input as DeleteCommandInput;
      if (Key) store.delete(itemKey(Key.PK, Key.SK));
      return {};
    }

    if (name === "QueryCommand") {
      const q = input as QueryCommandInput;
      let items = [...store.values()];
      items = items.filter((item) =>
        matchKeyCondition(
          item,
          q.IndexName,
          q.KeyConditionExpression,
          q.ExpressionAttributeValues,
          q.ExpressionAttributeNames
        )
      );
      items = items.filter((item) =>
        evalFilter(item, q.FilterExpression, q.ExpressionAttributeValues, q.ExpressionAttributeNames)
      );
      const { sk } = indexAttrs(q.IndexName);
      items.sort((a, b) => String(a[sk] ?? "").localeCompare(String(b[sk] ?? "")));
      if (q.ScanIndexForward === false) items.reverse();
      if (q.Limit) items = items.slice(0, q.Limit);
      return { Items: items };
    }

    if (name === "ScanCommand") {
      const s = input as ScanCommandInput;
      let items = [...store.values()];
      items = items.filter((item) =>
        evalFilter(item, s.FilterExpression, s.ExpressionAttributeValues, s.ExpressionAttributeNames)
      );
      if (s.Limit) items = items.slice(0, s.Limit);
      return { Items: items };
    }

    if (name === "UpdateCommand") {
      const u = input as UpdateCommandInput;
      if (!u.Key) return {};
      const key = itemKey(u.Key.PK, u.Key.SK);
      const existing = store.get(key) ?? { PK: u.Key.PK, SK: u.Key.SK };
      const updated = applyUpdate(existing, u);
      store.set(key, updated);
      return { Attributes: updated };
    }

    if (name === "BatchWriteCommand") {
      const requestItems = (input.RequestItems ?? {}) as Record<
        string,
        Array<{ PutRequest?: { Item?: Item }; DeleteRequest?: { Key?: Item } }>
      >;
      for (const [tableName, ops] of Object.entries(requestItems)) {
        const t = tableFor(tableName);
        for (const op of ops ?? []) {
          if (op.PutRequest?.Item) {
            const item = op.PutRequest.Item;
            t.set(itemKey(item.PK, item.SK), { ...item });
          }
          if (op.DeleteRequest?.Key) {
            const key = op.DeleteRequest.Key;
            t.delete(itemKey(key.PK, key.SK));
          }
        }
      }
      return { UnprocessedItems: {} };
    }

    return {};
  },
};

export function clearMemoryStore() {
  tables.clear();
}

export function getMemoryStoreSize() {
  let total = 0;
  for (const t of tables.values()) total += t.size;
  return total;
}
