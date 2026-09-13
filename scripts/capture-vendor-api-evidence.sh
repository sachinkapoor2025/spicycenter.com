#!/usr/bin/env bash
# Live-capture Orange County Vendor API evidence for the shareable PDF.
# Uses custom domain; does not mutate real customer shipment/tracking (validation + 404 only).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
EVIDENCE="$ROOT/docs/vendor-api-evidence"
BASE="${VENDOR_API_BASE:-https://orange-county.usarakhi.com}"
KEY="${ORANGE_COUNTY_VENDOR_API_KEY:-4bf361b07a50b6346046b8b446fbbe6f5151c404bad6e46431c94bd1172d2673}"
AUTH="X-Vendor-Api-Key: ${KEY}"
TS="$(date -u +%Y-%m-%dT%H:%M:%SZ)"

mkdir -p "$EVIDENCE/screenshots"
echo "$TS" > "$EVIDENCE/verified_at.txt"

run() {
  local name="$1"; shift
  local outfile="$EVIDENCE/${name}.txt"
  local jsonfile="$EVIDENCE/${name}.json"
  {
    echo "=== FEATURE: ${name} ==="
    echo "Verified (UTC): ${TS}"
    echo "Command:"
    printf '  %s\n' "curl -sS $*"
    echo ""
    echo "--- Response ---"
  } > "$outfile"
  local tmp hdr http
  tmp="$(mktemp)"; hdr="$(mktemp)"
  http="$(curl -sS -D "$hdr" -o "$tmp" -w '%{http_code}' "$@" || true)"
  {
    echo "HTTP ${http}"
    echo ""
    # keep status + content-type lines
    awk 'BEGIN{IGNORECASE=1} /^HTTP\// || /^[Cc]ontent-[Tt]ype:/ || /^[Dd]ate:/ {print}' "$hdr"
    echo ""
    if python3 -c "import json,sys; json.load(open(sys.argv[1]))" "$tmp" 2>/dev/null; then
      python3 -m json.tool < "$tmp"
      cp "$tmp" "$jsonfile"
      python3 -m json.tool < "$tmp" > "$jsonfile"
    else
      cat "$tmp"
      cp "$tmp" "$jsonfile"
    fi
  } >> "$outfile"
  rm -f "$tmp" "$hdr"
  echo "captured ${name} -> HTTP ${http}"
}

echo "Capturing against ${BASE} at ${TS}"

run 01_health \
  "${BASE}/health"

run 02_auth_missing_key \
  "${BASE}/vendors/orange-county/orders?days=15&limit=1"

run 03_list_orders_page1 \
  -H "${AUTH}" \
  "${BASE}/vendors/orange-county/orders?days=15&limit=50"

# Page size 1 for pagination demo
run 05_list_orders_limit1 \
  -H "${AUTH}" \
  "${BASE}/vendors/orange-county/orders?days=15&limit=1"

CURSOR="$(python3 - <<'PY'
import json
from pathlib import Path
p = Path("docs/vendor-api-evidence/05_list_orders_limit1.json")
d = json.loads(p.read_text())
print(d.get("nextCursor") or "")
PY
)"
echo "$CURSOR" > "$EVIDENCE/next_cursor.txt"

if [[ -n "$CURSOR" ]]; then
  run 04_list_orders_page2 \
    -H "${AUTH}" \
    "${BASE}/vendors/orange-county/orders?days=15&limit=1&cursor=${CURSOR}"
else
  echo '{"orders":[],"count":0,"hasMore":false,"nextCursor":null,"note":"no second page"}' \
    > "$EVIDENCE/04_list_orders_page2.json"
  echo "no nextCursor — wrote empty page2 stub"
fi

# Pick sample order numbers / UUID from list
python3 - <<'PY'
import json
from pathlib import Path
ev = Path("docs/vendor-api-evidence")
orders = []
for name in ("03_list_orders_page1.json", "05_list_orders_limit1.json", "04_list_orders_page2.json"):
    p = ev / name
    if not p.exists():
        continue
    d = json.loads(p.read_text())
    orders.extend(d.get("orders") or [])
if not orders:
    raise SystemExit("No orders found to build get-order evidence")
# Prefer an OC##### orderNumber if present
sample = next((o for o in orders if str(o.get("orderNumber") or "").startswith("OC")), orders[0])
(ev / "sample_order_number.txt").write_text(str(sample.get("orderNumber") or sample.get("orderId") or ""))
(ev / "sample_internal_id.txt").write_text(str(sample.get("internalOrderId") or ""))
print("sample orderNumber=", sample.get("orderNumber"))
print("sample internalOrderId=", sample.get("internalOrderId"))
PY

ORDER_NUM="$(cat "$EVIDENCE/sample_order_number.txt")"
INTERNAL_ID="$(cat "$EVIDENCE/sample_internal_id.txt")"

run 06_get_order \
  -H "${AUTH}" \
  "${BASE}/vendors/orange-county/orders/${ORDER_NUM}"

run 06b_get_order_by_uuid \
  -H "${AUTH}" \
  "${BASE}/vendors/orange-county/orders/${INTERNAL_ID}"

run 07_get_order_not_found \
  -H "${AUTH}" \
  "${BASE}/vendors/orange-county/orders/OC99999"

run 08_shipment_body_validation \
  -H "${AUTH}" \
  -H "Content-Type: application/json" \
  -d '{}' \
  -X POST \
  "${BASE}/vendors/orange-county/shipment"

run 09_tracking_body_validation \
  -H "${AUTH}" \
  -H "Content-Type: application/json" \
  -d '{}' \
  -X POST \
  "${BASE}/vendors/orange-county/tracking"

run 10_shipment_path_validation \
  -H "${AUTH}" \
  -H "Content-Type: application/json" \
  -d "{\"orderNumber\":\"${ORDER_NUM}\",\"courierName\":\"USPS\"}" \
  -X POST \
  "${BASE}/vendors/orange-county/orders/${ORDER_NUM}/shipment"

run 11_tracking_path_validation \
  -H "${AUTH}" \
  -H "Content-Type: application/json" \
  -d "{\"orderNumber\":\"${ORDER_NUM}\"}" \
  -X POST \
  "${BASE}/vendors/orange-county/orders/${ORDER_NUM}/tracking"

run 12_shipment_unknown_order \
  -H "${AUTH}" \
  -H "Content-Type: application/json" \
  -d '{"orderNumber":"OC99999","courierName":"USPS","awb":"9400111899223344556677"}' \
  -X POST \
  "${BASE}/vendors/orange-county/shipment"

run 13_tracking_unknown_order \
  -H "${AUTH}" \
  -H "Content-Type: application/json" \
  -d '{"orderNumber":"OC99999","currentShipmentStatus":"in_transit"}' \
  -X POST \
  "${BASE}/vendors/orange-county/tracking"

# Example success payloads (documented shape; not a live mutation)
python3 - <<PY
import json
from pathlib import Path
from datetime import datetime, timezone
ev = Path("docs/vendor-api-evidence")
order_num = (ev / "sample_order_number.txt").read_text().strip() or "OC10003"
internal = (ev / "sample_internal_id.txt").read_text().strip() or "00000000-0000-0000-0000-000000000000"
now = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.000Z")
(ev / "sample_shipment_success.json").write_text(json.dumps({
    "orderId": order_num,
    "orderNumber": order_num,
    "internalOrderId": internal,
    "status": "shipped",
    "awb": "9400111899223344556677",
    "courierName": "USPS",
    "updatedAt": now,
}, indent=2) + "\n")
(ev / "sample_tracking_success.json").write_text(json.dumps({
    "orderId": order_num,
    "orderNumber": order_num,
    "internalOrderId": internal,
    "status": "in_transit",
    "currentShipmentStatus": "in_transit",
    "updatedAt": now,
}, indent=2) + "\n")
print("wrote sample success shapes")
PY

# Compact previews for PDF — keep full phone/country (USPS needs unmasked phone).
python3 - <<'PY'
import json
from pathlib import Path

ev = Path("docs/vendor-api-evidence")

def compact_list(src, dest, limit_orders=2):
    d = json.loads((ev / src).read_text())
    preview = {
        "vendorSlug": d.get("vendorSlug"),
        "count": d.get("count"),
        "limit": d.get("limit"),
        "days": d.get("days"),
        "hasMore": d.get("hasMore"),
        "nextCursor": (d.get("nextCursor")[:24] + "…") if d.get("nextCursor") else None,
        "orders": [],
    }
    for o in (d.get("orders") or [])[:limit_orders]:
        preview["orders"].append({
            "orderNumber": o.get("orderNumber"),
            "internalOrderId": o.get("internalOrderId"),
            "status": o.get("status"),
            "orderValue": o.get("orderValue"),
            "orderValueCurrency": o.get("orderValueCurrency"),
            "senderName": o.get("senderName"),
            "recipientName": o.get("recipientName"),
            "recipientAddressLine1": o.get("recipientAddressLine1"),
            "recipientAddressLine2": o.get("recipientAddressLine2"),
            "city": o.get("city"),
            "state": o.get("state"),
            "country": o.get("country"),
            "zipCode": o.get("zipCode"),
            "recipientPhoneNumber": o.get("recipientPhoneNumber"),
            "itemCount": len(o.get("items") or []),
            "items": [
                {
                    "sku": i.get("sku") or i.get("productCode"),
                    "productName": i.get("productName"),
                    "quantity": i.get("quantity"),
                    "price": i.get("price"),
                }
                for i in (o.get("items") or [])[:3]
            ],
        })
    (ev / dest).write_text(json.dumps(preview, indent=2) + "\n")

def compact_order(src, dest):
    d = json.loads((ev / src).read_text())
    o = d.get("order") or d
    compact = {
        "orderNumber": o.get("orderNumber"),
        "orderId": o.get("orderId"),
        "internalOrderId": o.get("internalOrderId"),
        "status": o.get("status"),
        "orderDate": o.get("orderDate") or o.get("createdAt"),
        "senderName": o.get("senderName"),
        "recipientName": o.get("recipientName"),
        "recipientAddressLine1": o.get("recipientAddressLine1"),
        "recipientAddressLine2": o.get("recipientAddressLine2"),
        "city": o.get("city"),
        "state": o.get("state"),
        "zipCode": o.get("zipCode"),
        "country": o.get("country"),
        "recipientPhoneNumber": o.get("recipientPhoneNumber"),
        "orderValue": o.get("orderValue"),
        "orderValueCurrency": o.get("orderValueCurrency"),
        "giftMessage": (o.get("giftMessage") or "")[:80],
        "items": [
            {
                "sku": i.get("sku") or i.get("productCode"),
                "productName": i.get("productName"),
                "quantity": i.get("quantity"),
                "price": i.get("price"),
                "weight": i.get("weight"),
                "weightUnit": i.get("weightUnit"),
            }
            for i in (o.get("items") or [])
        ],
    }
    (ev / dest).write_text(json.dumps(compact, indent=2) + "\n")

compact_list("03_list_orders_page1.json", "03_list_orders_page1_compact.json", 2)
if (ev / "04_list_orders_page2.json").exists():
    compact_list("04_list_orders_page2.json", "04_list_orders_page2_compact.json", 1)
compact_list("05_list_orders_limit1.json", "05_list_orders_limit1_compact.json", 1)
compact_order("06_get_order.json", "06_get_order_compact.json")
print("wrote compact previews")
PY

echo "DONE — evidence at $EVIDENCE (verified $TS)"
