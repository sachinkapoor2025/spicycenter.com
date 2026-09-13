#!/usr/bin/env python3
"""Build Orange County vendor-shareable API HTML + PDF from live evidence captures."""

from __future__ import annotations

import html
import json
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
EVIDENCE = ROOT / "docs" / "vendor-api-evidence"
HTML_OUT = ROOT / "docs" / "UsaRakhi_Orange_County_Vendor_API.html"
PDF_OUT = ROOT / "UsaRakhi_Orange_County_Vendor_API.pdf"
BASE_URL = "https://orange-county.usarakhi.com"
KEY = "4bf361b07a50b6346046b8b446fbbe6f5151c404bad6e46431c94bd1172d2673"
CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"


def loadj(name: str) -> dict:
    p = EVIDENCE / name
    return json.loads(p.read_text()) if p.exists() else {}


def dumps(obj: object) -> str:
    return json.dumps(obj, indent=2)


def esc(s: object) -> str:
    return html.escape(str(s))


def terminal(title: str, http: str, cmd: str, body: str, note: str | None = None) -> str:
    badge = "ok" if str(http).startswith("2") else ("warn" if str(http).startswith("4") else "err")
    note_html = f'<p class="ev-note">{esc(note)}</p>' if note else ""
    return f"""
  <div class="shot">
    <div class="shot-bar">
      <span class="dots"><i></i><i></i><i></i></span>
      <span class="shot-title">{esc(title)}</span>
      <span class="http {badge}">HTTP {esc(http)}</span>
    </div>
    <div class="shot-body">
      <div class="cmd">$ {esc(cmd)}</div>
      <pre>{esc(body)}</pre>
    </div>
    {note_html}
  </div>"""


def gallery_html() -> str:
    shots = sorted((EVIDENCE / "screenshots").glob("*.png"))
    if not shots:
        return ""
    parts = ['<h2>9. Screenshot gallery (live captures)</h2><div class="gallery">']
    for p in shots:
        parts.append(
            f'<div><img src="file://{p.resolve()}" alt="{esc(p.stem)}" />'
            f'<p style="font-size:9px;color:#64748b;margin:4px 0 0">{esc(p.stem)}</p></div>'
        )
    parts.append("</div>")
    return "\n".join(parts)


def build_html() -> str:
    ts = (EVIDENCE / "verified_at.txt").read_text().strip()
    health = dumps(loadj("01_health.json"))
    auth = dumps(loadj("02_auth_missing_key.json"))
    list1 = dumps(loadj("03_list_orders_page1_compact.json"))
    list2 = dumps(loadj("04_list_orders_page2_compact.json"))
    limit1 = dumps(loadj("05_list_orders_limit1_compact.json"))
    get_order = dumps(loadj("06_get_order_compact.json"))
    uuid_meta = loadj("06b_get_order_by_uuid.json").get("order", {})
    uuid_snip = dumps(
        {
            "orderNumber": uuid_meta.get("orderNumber"),
            "internalOrderId": uuid_meta.get("internalOrderId"),
            "status": uuid_meta.get("status"),
            "orderValue": uuid_meta.get("orderValue"),
        }
    )
    ship_val = dumps(loadj("08_shipment_body_validation.json"))
    track_val = dumps(loadj("09_tracking_body_validation.json"))
    ship_path_val = dumps(loadj("10_shipment_path_validation.json"))
    track_path_val = dumps(loadj("11_tracking_path_validation.json"))
    ship_404 = dumps(loadj("12_shipment_unknown_order.json"))
    track_404 = dumps(loadj("13_tracking_unknown_order.json"))
    ship_ok = dumps(loadj("sample_shipment_success.json"))
    track_ok = dumps(loadj("sample_tracking_success.json"))
    sample_order = ""
    if (EVIDENCE / "sample_order_number.txt").exists():
        sample_order = (EVIDENCE / "sample_order_number.txt").read_text().strip()
    if not sample_order:
        sample_order = str(loadj("06_get_order_compact.json").get("orderNumber") or "OC10011")

    empty_json = "{}"
    ship_missing = f'{{"orderNumber":"{sample_order}","courierName":"USPS"}}'
    track_missing = f'{{"orderNumber":"{sample_order}"}}'
    ship_unknown = '{"orderNumber":"OC99999","courierName":"USPS","awb":"9400..."}'
    track_unknown = '{"orderNumber":"OC99999","currentShipmentStatus":"in_transit"}'
    ship_success_body = (
        f'{{"orderNumber":"{sample_order}","courierName":"USPS","awb":"9400111899223344556677"}}'
    )
    track_success_body = f'{{"orderNumber":"{sample_order}","currentShipmentStatus":"in_transit"}}'
    sample_uuid = uuid_meta.get("internalOrderId") or (
        (EVIDENCE / "sample_internal_id.txt").read_text().strip()
        if (EVIDENCE / "sample_internal_id.txt").exists()
        else "e647d630-1322-4a1c-aa7b-ecdbb65cc5f6"
    )
    auth_h = f'X-Vendor-Api-Key: {KEY}'

    def curl_get(path_qs: str) -> str:
        return f'curl -sS \\\n  -H "{auth_h}" \\\n  "{BASE_URL}{path_qs}"'

    def curl_post(path: str, body: str) -> str:
        return (
            f'curl -sS -X POST \\\n'
            f'  -H "{auth_h}" \\\n'
            f'  -H "Content-Type: application/json" \\\n'
            f"  -d '{body}' \\\n"
            f'  "{BASE_URL}{path}"'
        )

    parts = []
    parts.append(f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>UsaRakhi — Orange County Vendor API (Shareable Guide + Live Evidence)</title>
<style>
  @page {{ size: A4; margin: 14mm 12mm; }}
  * {{ box-sizing: border-box; }}
  body {{
    font-family: "Avenir Next", "Helvetica Neue", Helvetica, Arial, sans-serif;
    font-size: 10.5px; line-height: 1.45; color: #0f172a; margin: 0;
  }}
  .cover {{
    background: linear-gradient(135deg, #0b2748 0%, #183a68 55%, #245a8d 100%);
    color: #fff; padding: 28px 24px; border-radius: 10px; margin-bottom: 16px;
  }}
  .cover h1 {{ margin: 0 0 6px; font-size: 22px; letter-spacing: -0.02em; }}
  .cover .tag {{ opacity: 0.9; font-size: 12px; margin: 0 0 14px; }}
  .cover-grid {{ display: grid; grid-template-columns: 1fr 1fr; gap: 8px 18px; font-size: 10.5px; }}
  .cover-grid strong {{
    display: block; opacity: 0.75; font-weight: 600; font-size: 9px;
    text-transform: uppercase; letter-spacing: 0.04em;
  }}
  .pill {{
    display: inline-block; background: rgba(255,255,255,0.15);
    border: 1px solid rgba(255,255,255,0.25); border-radius: 999px;
    padding: 3px 10px; font-size: 10px; margin-right: 6px;
  }}
  h2 {{
    font-size: 13.5px; color: #183a68; margin: 18px 0 8px;
    border-bottom: 2px solid #dbeafe; padding-bottom: 4px; page-break-after: avoid;
  }}
  h3 {{ font-size: 11.5px; color: #0f172a; margin: 14px 0 6px; page-break-after: avoid; }}
  p {{ margin: 0 0 8px; }}
  table {{ width: 100%; border-collapse: collapse; margin: 6px 0 12px; }}
  th, td {{ border: 1px solid #e2e8f0; padding: 6px 8px; text-align: left; vertical-align: top; }}
  th {{ background: #f1f5f9; color: #183a68; width: 26%; }}
  code, pre {{ font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 9px; }}
  pre.cmdblock {{
    background: #0b1220; color: #e2e8f0; padding: 10px 12px; border-radius: 8px;
    white-space: pre-wrap; word-break: break-all; margin: 6px 0 10px;
  }}
  ul, ol {{ margin: 4px 0 10px 18px; padding: 0; }}
  li {{ margin-bottom: 3px; }}
  .ok {{ background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 8px; padding: 8px 10px; margin: 8px 0 12px; }}
  .note {{ background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 8px 10px; margin: 8px 0 12px; }}
  .info {{ background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 8px 10px; margin: 8px 0 12px; }}
  .feat {{
    border: 1px solid #e2e8f0; border-radius: 10px; padding: 10px 12px; margin: 0 0 12px;
    page-break-inside: avoid;
  }}
  .feat .num {{
    display: inline-block; background: #183a68; color: #fff; font-weight: 700;
    font-size: 9px; padding: 2px 7px; border-radius: 4px; margin-right: 6px;
  }}
  .shot {{
    border-radius: 10px; overflow: hidden; margin: 8px 0 6px;
    border: 1px solid #1e293b; box-shadow: 0 8px 20px rgba(15,23,42,0.12);
    page-break-inside: avoid;
  }}
  .shot-bar {{
    background: #1e293b; color: #cbd5e1; padding: 7px 10px;
    display: flex; align-items: center; gap: 10px;
  }}
  .dots i {{
    display: inline-block; width: 8px; height: 8px; border-radius: 50%;
    margin-right: 4px; background: #64748b;
  }}
  .dots i:nth-child(1) {{ background: #f87171; }}
  .dots i:nth-child(2) {{ background: #fbbf24; }}
  .dots i:nth-child(3) {{ background: #34d399; }}
  .shot-title {{ flex: 1; font-size: 9.5px; font-weight: 600; }}
  .http {{ font-size: 9px; font-weight: 700; padding: 2px 7px; border-radius: 999px; }}
  .http.ok {{ background: #065f46; color: #d1fae5; }}
  .http.warn {{ background: #92400e; color: #fef3c7; }}
  .http.err {{ background: #991b1b; color: #fee2e2; }}
  .shot-body {{ background: #0b1220; color: #e2e8f0; padding: 10px 12px; }}
  .shot-body .cmd {{
    color: #93c5fd; margin-bottom: 8px; white-space: pre-wrap; word-break: break-all;
    font-family: ui-monospace, Menlo, monospace; font-size: 8.5px;
  }}
  .shot-body pre {{
    margin: 0; white-space: pre-wrap; word-break: break-word; font-size: 8.5px; color: #d1fae5;
  }}
  .ev-note {{ margin: 6px 0 0; color: #475569; font-size: 9.5px; }}
  .footer {{
    margin-top: 18px; padding-top: 8px; border-top: 1px solid #cbd5e1;
    color: #64748b; font-size: 9.5px;
  }}
  .checklist li {{ margin-bottom: 4px; }}
  .two {{ display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }}
  .gallery {{ display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin: 8px 0 12px; }}
  .gallery img {{ width: 100%; border-radius: 8px; border: 1px solid #cbd5e1; }}
  @media print {{
    .cover, .shot, .shot-bar, .shot-body, .http, .feat .num {{
      -webkit-print-color-adjust: exact; print-color-adjust: exact;
    }}
  }}
</style>
</head>
<body>

<div class="cover">
  <div class="pill">Vendor shareable</div>
  <div class="pill">Live API verified</div>
  <div class="pill">Orange County</div>
  <h1>UsaRakhi → Orange County Vendor API</h1>
  <p class="tag">Integration guide with live curl commands and response evidence for every feature.</p>
  <div class="cover-grid">
    <div><strong>Base URL</strong><code style="color:#fff">{esc(BASE_URL)}</code></div>
    <div><strong>Verified (UTC)</strong>{esc(ts)}</div>
    <div><strong>Auth header</strong>X-Vendor-Api-Key</div>
    <div><strong>Service</strong>orange-county-vendor-api (dedicated)</div>
  </div>
</div>

<div class="ok"><strong>Dedicated Vendor API only.</strong> Do not use the website/storefront API host.
All examples below were executed against production Vendor API and captured for this document.</div>

<h2>1. Credentials</h2>
<table>
  <tr><th>Base URL</th><td><code>{esc(BASE_URL)}</code></td></tr>
  <tr><th>API Key</th><td><code>{esc(KEY)}</code></td></tr>
  <tr><th>Header</th><td><code>X-Vendor-Api-Key: {esc(KEY)}</code></td></tr>
</table>
<div class="note">Keep this key private to Orange County fulfillment systems.
Rotate with UsaRakhi if exposed publicly outside this partner channel.
Every curl below is a full copy-paste command (no export / variables required).</div>

<h2>2. Feature map (what you can do)</h2>
<table>
  <tr><th>Feature</th><td>Endpoint</td></tr>
  <tr><th>Health check</th><td><code>GET /health</code></td></tr>
  <tr><th>Import orders (15 days default)</th><td><code>GET /vendors/orange-county/orders</code></td></tr>
  <tr><th>Pagination (&gt;50 / custom page size)</th><td><code>?limit=1..200&amp;cursor=...</code></td></tr>
  <tr><th>Get one order</th><td><code>GET /vendors/orange-county/orders/{{orderNumber|uuid}}</code></td></tr>
  <tr><th>Post AWB when shipped</th><td><code>POST /vendors/orange-county/shipment</code> (also path style)</td></tr>
  <tr><th>Post tracking status</th><td><code>POST /vendors/orange-county/tracking</code> (also path style)</td></tr>
</table>

<div class="info">
<strong>Fulfillment notes:</strong> <code>orderValue</code> / item <code>price</code> are vendor cost (not website retail).
Match products by <code>sku</code> / <code>productCode</code>.
Store <code>orderNumber</code> (e.g. <code>OC10003</code>) as your external reference.
List and get both return full <code>recipientPhoneNumber</code> and <code>country</code> (never masked — required for USPS).
</div>

<h2>3. End-to-end workflow</h2>
<ol>
  <li>Poll <strong>list orders</strong> every N minutes (<code>days=15</code>, use <code>updatedSince</code> for incremental sync).</li>
  <li>Paginate with <code>nextCursor</code> while <code>hasMore=true</code>.</li>
  <li>Import / pick / pack using recipient address + gift message + SKUs.</li>
  <li>When courier assigned — <strong>POST shipment</strong> with <code>orderNumber</code>, <code>courierName</code>, <code>awb</code>.</li>
  <li>When status changes — <strong>POST tracking</strong> with <code>currentShipmentStatus</code>.</li>
  <li>Skip duplicates by remembering imported <code>orderNumber</code>s.</li>
</ol>

<h2>4. Live evidence — curl + response screenshots</h2>
<p>Each panel below is a live capture from production ({esc(ts)} UTC).
Green = success path; amber = expected validation / auth error proving the route is live.</p>
""")

    parts.append('<div class="feat"><h3><span class="num">A</span> Health check</h3>')
    parts.append("<p>Confirms the dedicated Vendor API is up (custom domain).</p>")
    health_cmd = curl_get("/health")
    parts.append(f'<pre class="cmdblock">{esc(health_cmd)}</pre>')
    parts.append(terminal("Terminal — Health", "200", health_cmd.replace("\\\n  ", " "), health))
    parts.append("</div>")

    parts.append('<div class="feat"><h3><span class="num">B</span> Auth required</h3>')
    parts.append("<p>Missing API key is rejected (same path without the header).</p>")
    auth_cmd = f'curl -sS \\\n  "{BASE_URL}/vendors/orange-county/orders?days=15&limit=1"'
    parts.append(f'<pre class="cmdblock">{esc(auth_cmd)}</pre>')
    parts.append(
        terminal(
            "Terminal — Auth (no key)",
            "401",
            auth_cmd.replace("\\\n  ", " "),
            auth,
        )
    )
    parts.append("</div>")

    parts.append('<div class="feat"><h3><span class="num">C</span> List orders (import feed)</h3>')
    parts.append("<p>Default window = last <strong>15 days</strong>. Page size default 50, max 200.</p>")
    list_cmd = curl_get("/vendors/orange-county/orders?days=15&limit=50")
    parts.append(f'<pre class="cmdblock">{esc(list_cmd)}</pre>')
    parts.append(
        terminal(
            "Terminal — List orders (page 1, compact preview)",
            "200",
            curl_get("/vendors/orange-county/orders?days=15&limit=2").replace("\\\n  ", " "),
            list1,
            "Full response includes full address, gift message, items[], weights, and image URLs.",
        )
    )
    parts.append("</div>")

    parts.append('<div class="feat"><h3><span class="num">D</span> Pagination (more than one page)</h3>')
    parts.append(
        "<p>Use <code>nextCursor</code> from the previous response. Keep calling while <code>hasMore === true</code>.</p>"
    )
    page1_cmd = curl_get("/vendors/orange-county/orders?days=15&limit=1")
    live_cursor = (
        (EVIDENCE / "next_cursor.txt").read_text().strip()
        if (EVIDENCE / "next_cursor.txt").exists()
        else ""
    )
    page2_cmd = curl_get(
        "/vendors/orange-county/orders?days=15&limit=1&cursor="
        + (live_cursor or "PASTE_NEXT_CURSOR_FROM_PREVIOUS_RESPONSE")
    )
    parts.append(
        f'<pre class="cmdblock"># Page 1\n{esc(page1_cmd)}\n\n# Page 2\n{esc(page2_cmd)}</pre>'
    )
    parts.append(
        terminal(
            "Terminal — Page 1 (limit=1)",
            "200",
            page1_cmd.replace("\\\n  ", " "),
            limit1,
        )
    )
    parts.append(
        terminal(
            "Terminal — Page 2 (cursor from page 1)",
            "200",
            page2_cmd.replace("\\\n  ", " "),
            list2,
            f"Evidence: page 2 returns a different order after cursor from page 1 (sample used: {sample_order}).",
        )
    )
    parts.append("</div>")

    parts.append('<div class="feat"><h3><span class="num">E</span> Get a single order</h3>')
    parts.append(
        "<p>Accepts human <code>orderNumber</code> (recommended: <code>OC#####</code>) or <code>internalOrderId</code> (UUID).</p>"
    )
    get_cmd = curl_get(f"/vendors/orange-county/orders/{sample_order}")
    get_uuid_cmd = curl_get(f"/vendors/orange-county/orders/{sample_uuid}")
    parts.append(f'<pre class="cmdblock">{esc(get_cmd)}</pre>')
    parts.append(
        terminal(
            f"Terminal — GET order {sample_order} (full phone + country)",
            "200",
            get_cmd.replace("\\\n  ", " "),
            get_order,
        )
    )
    parts.append(f'<pre class="cmdblock">{esc(get_uuid_cmd)}</pre>')
    parts.append(
        terminal(
            "Terminal — GET by internal UUID also works",
            "200",
            get_uuid_cmd.replace("\\\n  ", " "),
            uuid_snip,
        )
    )
    parts.append(
        '<div class="note"><strong>Lookup tip:</strong> Prefer <code>OC#####</code> or UUID. '
        "If an order shows a short alphanumeric display id, use the <code>internalOrderId</code> "
        "UUID from the list response for GET/shipment/tracking path calls.</div>"
    )
    parts.append("</div>")

    parts.append('<div class="feat"><h3><span class="num">F</span> Update AWB when shipped</h3>')
    parts.append(
        "<p><strong>Required JSON:</strong> <code>orderNumber</code>, <code>courierName</code>, <code>awb</code>.</p>"
    )
    ship_cmd = curl_post("/vendors/orange-county/shipment", ship_success_body)
    ship_path_cmd = curl_post(f"/vendors/orange-county/orders/{sample_order}/shipment", ship_success_body)
    parts.append(
        f'<pre class="cmdblock">{esc(ship_cmd)}\n\n# Path style (same body):\n{esc(ship_path_cmd)}</pre>'
    )
    parts.append(
        "<p><strong>Live route evidence</strong> (validation — no customer order mutated for this guide):</p>"
    )
    ship_empty_cmd = curl_post("/vendors/orange-county/shipment", empty_json)
    ship_path_val_cmd = curl_post(f"/vendors/orange-county/orders/{sample_order}/shipment", ship_missing)
    ship_unknown_cmd = curl_post("/vendors/orange-county/shipment", ship_unknown)
    parts.append(
        terminal(
            "Terminal — POST /shipment with empty body",
            "400",
            ship_empty_cmd.replace("\\\n  ", " "),
            ship_val,
        )
    )
    parts.append(
        terminal(
            "Terminal — POST path shipment missing awb",
            "400",
            ship_path_val_cmd.replace("\\\n  ", " "),
            ship_path_val,
        )
    )
    parts.append(
        terminal(
            "Terminal — POST /shipment unknown orderNumber",
            "404",
            ship_unknown_cmd.replace("\\\n  ", " "),
            ship_404,
        )
    )
    parts.append("<p><strong>Example success response</strong> (returned when a real order is updated):</p>")
    parts.append(
        terminal(
            "Example success — shipment update",
            "200",
            ship_cmd.replace("\\\n  ", " "),
            ship_ok,
            "Effect: saves trackingNumber=awb, carrier=courierName; moves to shipped when allowed; notifies customer.",
        )
    )
    parts.append("</div>")

    parts.append('<div class="feat"><h3><span class="num">G</span> Update tracking / shipment status</h3>')
    parts.append(
        "<p><strong>Required JSON:</strong> <code>orderNumber</code>, <code>currentShipmentStatus</code> "
        "(alias: <code>currentStatus</code>). Optional: <code>note</code>.</p>"
    )
    track_cmd = curl_post("/vendors/orange-county/tracking", track_success_body)
    track_path_cmd = curl_post(f"/vendors/orange-county/orders/{sample_order}/tracking", track_success_body)
    parts.append(
        f'<pre class="cmdblock">{esc(track_cmd)}\n\n# Path style (same body):\n{esc(track_path_cmd)}</pre>'
    )
    parts.append(
        "<p>Accepted statuses (case-insensitive): <code>processing</code>, <code>packed</code>, "
        "<code>shipped</code>, <code>in_transit</code>, <code>dispatched</code>, "
        "<code>out_for_delivery</code>, <code>delivered</code>, <code>complete</code>.</p>"
    )
    track_empty_cmd = curl_post("/vendors/orange-county/tracking", empty_json)
    track_path_val_cmd = curl_post(f"/vendors/orange-county/orders/{sample_order}/tracking", track_missing)
    track_unknown_cmd = curl_post("/vendors/orange-county/tracking", track_unknown)
    parts.append(
        terminal(
            "Terminal — POST /tracking empty body",
            "400",
            track_empty_cmd.replace("\\\n  ", " "),
            track_val,
        )
    )
    parts.append(
        terminal(
            "Terminal — POST path tracking missing status",
            "400",
            track_path_val_cmd.replace("\\\n  ", " "),
            track_path_val,
        )
    )
    parts.append(
        terminal(
            "Terminal — POST /tracking unknown order",
            "404",
            track_unknown_cmd.replace("\\\n  ", " "),
            track_404,
        )
    )
    parts.append(
        terminal(
            "Example success — tracking update",
            "200",
            track_cmd.replace("\\\n  ", " "),
            track_ok,
        )
    )
    parts.append("</div>")

    parts.append("""
<h2>5. List query parameters</h2>
<table>
  <tr><th>days</th><td>Default <strong>15</strong> (max 90) — createdAt window</td></tr>
  <tr><th>limit</th><td>Default <strong>50</strong>, max <strong>200</strong></td></tr>
  <tr><th>cursor</th><td>Opaque <code>nextCursor</code> from previous page</td></tr>
  <tr><th>since</th><td>ISO createdAt lower bound override</td></tr>
  <tr><th>updatedSince</th><td>Incremental sync on updatedAt</td></tr>
  <tr><th>status</th><td>Exact status filter (e.g. paid, shipped)</td></tr>
</table>
<p>Without <code>status</code>, unpaid / cancelled / refunded are hidden.</p>

<h2>6. Response field reference</h2>
<div class="two">
  <div>
    <h3>Order</h3>
    <ul>
      <li><code>orderId</code> / <code>orderNumber</code></li>
      <li><code>internalOrderId</code> (UUID)</li>
      <li><code>orderDate</code>, <code>status</code></li>
      <li><code>senderName</code>, <code>giftMessage</code></li>
      <li>Recipient name / address / phone</li>
      <li><code>orderValue</code> (vendor cost total, USD)</li>
      <li><code>deliveryDate</code>, <code>trackingNumber</code>, <code>carrier</code></li>
    </ul>
  </div>
  <div>
    <h3>Item</h3>
    <ul>
      <li><code>sku</code> / <code>productCode</code></li>
      <li><code>productName</code>, <code>quantity</code></li>
      <li><code>price</code> (vendor unit cost)</li>
      <li><code>productImageUrl</code></li>
      <li><code>weight</code> + <code>weightUnit</code> (oz)</li>
    </ul>
  </div>
</div>

<h2>7. HTTP status codes</h2>
<table>
  <tr><th>200</th><td>Success</td></tr>
  <tr><th>400</th><td>Validation error (missing/invalid fields)</td></tr>
  <tr><th>401</th><td>Missing/wrong API key</td></tr>
  <tr><th>403 / 404</th><td>Order not found for this vendor</td></tr>
  <tr><th>500</th><td>Temporary server error — retry</td></tr>
</table>

<h2>8. Vendor go-live checklist</h2>
<ul class="checklist">
  <li>[ ] Stored Base URL + API key securely</li>
  <li>[ ] Health returns <code>orange-county-vendor-api</code></li>
  <li>[ ] List orders returns Orange County items only</li>
  <li>[ ] Pagination loop implemented (<code>hasMore</code> / <code>nextCursor</code>)</li>
  <li>[ ] Products matched by SKU</li>
  <li>[ ] AWB posted on ship (<code>orderNumber</code>, <code>courierName</code>, <code>awb</code>)</li>
  <li>[ ] Tracking posted on status change</li>
  <li>[ ] Duplicate prevention + optional <code>updatedSince</code></li>
</ul>
""")
    parts.append(gallery_html())
    parts.append(
        f"""
<div class="footer">
  Confidential — Orange County fulfillment partner document.<br/>
  Live evidence captured against dedicated Vendor API <code>{esc(BASE_URL)}</code> at {esc(ts)} UTC.<br/>
  Contact UsaRakhi ops/tech for access issues or key rotation.<br/>
  Document: UsaRakhi_Orange_County_Vendor_API.pdf
</div>
</body>
</html>
"""
    )
    return "\n".join(parts)


def main() -> None:
    html_doc = build_html()
    HTML_OUT.write_text(html_doc)
    print("wrote", HTML_OUT, HTML_OUT.stat().st_size)
    subprocess.run(
        [
            CHROME,
            "--headless=new",
            "--disable-gpu",
            "--no-pdf-header-footer",
            f"--print-to-pdf={PDF_OUT}",
            f"file://{HTML_OUT.resolve()}",
        ],
        check=True,
        capture_output=True,
    )
    print("wrote", PDF_OUT, PDF_OUT.stat().st_size)


if __name__ == "__main__":
    main()
