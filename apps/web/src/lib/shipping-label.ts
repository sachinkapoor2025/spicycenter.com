import type { Order } from "@spicycorner/shared";
import { site } from "@/lib/site";
import { code128Svg } from "@/lib/barcode-code128";

const LABEL_ELIGIBLE = new Set([
  "paid",
  "accepted",
  "processing",
  "shipped",
  "delivered",
  "complete",
]);

export function canDownloadShippingLabel(status: string): boolean {
  return LABEL_ELIGIBLE.has(status);
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Build a single-page courier shipping label HTML (no prices — gift-friendly). */
export function buildShippingLabelHtml(order: Order): string {
  const addr = order.shippingAddress;
  const barcode = code128Svg(order.orderId, { height: 52, moduleWidth: 1.5 });
  const items = order.items
    .map(
      (item) =>
        `<tr>
          <td>${escapeHtml(item.name)}</td>
          <td style="text-align:center">${item.quantity}</td>
        </tr>`
    )
    .join("");
  const totalQty = order.items.reduce((sum, i) => sum + i.quantity, 0);
  const payment =
    order.paymentProvider === "razorpay"
      ? "Prepaid · Razorpay"
      : order.paymentProvider === "stripe"
        ? "Prepaid · Stripe"
        : "Prepaid";

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Shipping Label — ${escapeHtml(order.orderId)}</title>
  <style>
    @page { size: A4; margin: 12mm; }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: Arial, Helvetica, sans-serif;
      color: #0f172a;
      background: #fff;
    }
    .label {
      width: 100%;
      max-width: 180mm;
      margin: 0 auto;
      border: 2px solid #0f172a;
      page-break-inside: avoid;
    }
    .row { display: flex; border-bottom: 1.5px solid #0f172a; }
    .row:last-child { border-bottom: none; }
    .cell { padding: 8px 10px; }
    .cell + .cell { border-left: 1.5px solid #0f172a; }
    .brand { font-size: 18px; font-weight: 800; letter-spacing: 0.02em; }
    .muted { color: #475569; font-size: 11px; }
    .tag {
      display: inline-block;
      background: #0f172a;
      color: #fff;
      font-size: 11px;
      font-weight: 700;
      padding: 3px 8px;
      letter-spacing: 0.06em;
    }
    .section-title {
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: #64748b;
      margin: 0 0 4px;
    }
    .ship-name { font-size: 20px; font-weight: 800; margin: 0 0 4px; line-height: 1.2; }
    .addr { font-size: 13px; line-height: 1.35; margin: 0; }
    .barcode-wrap { text-align: center; padding: 10px 8px 6px; }
    .barcode-wrap svg { max-width: 100%; height: auto; }
    .order-id {
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      font-size: 13px;
      font-weight: 700;
      letter-spacing: 0.08em;
      margin-top: 4px;
    }
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    th {
      text-align: left;
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: #64748b;
      border-bottom: 1px solid #cbd5e1;
      padding: 4px 0;
    }
    td { padding: 5px 0; border-bottom: 1px solid #e2e8f0; vertical-align: top; }
    tr:last-child td { border-bottom: none; }
    .footer { font-size: 12px; }
    .hint { text-align: center; font-size: 10px; color: #94a3b8; margin-top: 10px; }
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .hint { display: none; }
    }
  </style>
</head>
<body>
  <div class="label">
    <div class="row">
      <div class="cell" style="flex:1">
        <div class="brand">${escapeHtml(site.name)}</div>
        <div class="muted">${escapeHtml(site.domain)} · ${escapeHtml(site.supportEmail)}</div>
      </div>
      <div class="cell" style="width:120px;text-align:center;display:flex;align-items:center;justify-content:center">
        <span class="tag">PREPAID</span>
      </div>
    </div>

    <div class="row">
      <div class="cell" style="flex:1">
        <p class="section-title">From</p>
        ${
          addr.senderName
            ? `<p class="addr" style="font-weight:700;margin:0">${escapeHtml(addr.senderName)}</p>
        <p class="addr muted">via ${escapeHtml(site.name)}</p>`
            : `<p class="addr" style="font-weight:700;margin:0">${escapeHtml(site.name)}</p>`
        }
        <p class="addr muted">${escapeHtml(site.supportEmail)}</p>
        <p class="addr muted">${escapeHtml(site.phone)}</p>
      </div>
      <div class="cell" style="flex:1.4">
        <p class="section-title">Ship to</p>
        <p class="ship-name">${escapeHtml(addr.name)}</p>
        <p class="addr">${escapeHtml(addr.line1)}</p>
        ${addr.line2 ? `<p class="addr">${escapeHtml(addr.line2)}</p>` : ""}
        <p class="addr">${escapeHtml(addr.city)}, ${escapeHtml(addr.state)} ${escapeHtml(addr.postalCode)}</p>
        <p class="addr">${escapeHtml(addr.country)}</p>
        <p class="addr" style="margin-top:6px">
          <strong>Mobile:</strong> ${escapeHtml(addr.phone || "—")}<br/>
          <strong>Email:</strong> ${escapeHtml(addr.email)}
        </p>
        ${
          addr.senderName
            ? `<p class="addr" style="margin-top:8px;padding-top:6px;border-top:1px dashed #cbd5e1">
          <strong>Gift from:</strong> ${escapeHtml(addr.senderName)}
        </p>`
            : ""
        }
      </div>
    </div>

    ${
      addr.senderMessage
        ? `<div class="row">
      <div class="cell" style="flex:1">
        <p class="section-title">Message from ${escapeHtml(addr.senderName || "sender")}</p>
        <p class="addr" style="font-style:italic;line-height:1.45;white-space:pre-wrap">${escapeHtml(addr.senderMessage)}</p>
      </div>
    </div>`
        : ""
    }

    <div class="barcode-wrap">
      <p class="section-title" style="margin-bottom:6px">Order barcode</p>
      ${barcode}
      <div class="order-id">${escapeHtml(order.orderId)}</div>
    </div>

    <div class="row">
      <div class="cell" style="flex:1">
        <p class="section-title">Products (${totalQty} item${totalQty === 1 ? "" : "s"})</p>
        <table>
          <thead>
            <tr>
              <th>Product</th>
              <th style="text-align:center;width:48px">Qty</th>
            </tr>
          </thead>
          <tbody>${items}</tbody>
        </table>
      </div>
    </div>

    <div class="row">
      <div class="cell" style="flex:1">
        <div class="footer">
          <div class="muted">Payment</div>
          <div><strong>${escapeHtml(payment)}</strong></div>
          <div class="muted" style="margin-top:4px">
            Placed ${escapeHtml(new Date(order.createdAt).toLocaleDateString())}
            ${order.carrier ? ` · ${escapeHtml(order.carrier)}` : ""}
            ${order.trackingNumber ? ` · ${escapeHtml(order.trackingNumber)}` : ""}
          </div>
        </div>
      </div>
    </div>
  </div>
  <p class="hint">Print this page · one label per sheet · stick on courier package</p>
  <script>window.onload = function () { window.focus(); window.print(); };</script>
</body>
</html>`;
}

/** Open print dialog for a courier-ready shipping label. */
export function printShippingLabel(order: Order): void {
  const win = window.open("", "_blank", "width=800,height=1000");
  if (!win) {
    window.alert("Please allow pop-ups to download the shipping label.");
    return;
  }
  win.document.open();
  win.document.write(buildShippingLabelHtml(order));
  win.document.close();
}
