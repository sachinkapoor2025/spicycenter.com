"use client";

import { site, whatsappChatUrl } from "@/lib/site";
import { StoreLocations } from "@/components/StoreLocations";

export function MarketContactBlock() {
  return (
    <div className="space-y-4 text-white/90">
      <StoreLocations variant="dark" />
      <p>
        <span className="text-white/60 text-xs uppercase tracking-wide block mb-0.5">Email</span>
        <a href={`mailto:${site.supportEmail}`} className="font-medium hover:text-white hover:underline">
          {site.supportEmail}
        </a>
      </p>
      <p>
        <span className="text-white/60 text-xs uppercase tracking-wide block mb-0.5">WhatsApp</span>
        <a
          href={whatsappChatUrl()}
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium hover:text-white hover:underline"
        >
          Chat on WhatsApp
        </a>
      </p>
    </div>
  );
}
