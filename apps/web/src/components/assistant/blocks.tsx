"use client";

import { useEffect } from "react";
import Link from "next/link";
import type { AssistantProduct, ChatBlock, ChatQuickAction } from "@spicycorner/shared";
import { ProductImage } from "@/components/ProductImage";
import { markChatAssistedTouch } from "@/lib/attribution-store";
import { trackChatProductClick, trackChatProductImpression } from "@/lib/track";

export function TypingIndicator({ label = "Finding the best options for you..." }: { label?: string }) {
  return (
    <div className="flex justify-start">
      <div className="rounded-2xl rounded-bl-md bg-white/10 px-4 py-3 text-sm text-white/80">
        <span className="inline-flex items-center gap-2">
          <span className="inline-flex gap-1" aria-hidden>
            <span className="h-1.5 w-1.5 rounded-full bg-white/70 animate-bounce [animation-delay:0ms]" />
            <span className="h-1.5 w-1.5 rounded-full bg-white/70 animate-bounce [animation-delay:150ms]" />
            <span className="h-1.5 w-1.5 rounded-full bg-white/70 animate-bounce [animation-delay:300ms]" />
          </span>
          {label}
        </span>
      </div>
    </div>
  );
}

export function QuickActionRow({
  actions,
  onAction,
}: {
  actions: ChatQuickAction[];
  onAction: (action: ChatQuickAction) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {actions.map((action) =>
        action.href ? (
          <Link
            key={action.id}
            href={action.href}
            target={action.href.startsWith("http") ? "_blank" : undefined}
            rel={action.href.startsWith("http") ? "noopener noreferrer" : undefined}
            className="rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-medium text-white hover:bg-white/20 transition"
            onClick={() => onAction(action)}
          >
            {action.label}
          </Link>
        ) : (
          <button
            key={action.id}
            type="button"
            onClick={() => onAction(action)}
            className="rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-medium text-white hover:bg-white/20 transition"
          >
            {action.label}
          </button>
        )
      )}
    </div>
  );
}

function AssistantProductCard({
  product,
  position,
  onAddToCart,
}: {
  product: AssistantProduct;
  position: number;
  onAddToCart: (product: AssistantProduct) => void;
  adding?: boolean;
}) {
  useEffect(() => {
    trackChatProductImpression(product.slug, position);
  }, [product.slug, position]);

  return (
    <article className="w-[148px] shrink-0 overflow-hidden rounded-xl bg-white text-slate-900 shadow-sm">
      <Link
        href={product.url}
        className="block"
        onClick={() => {
          markChatAssistedTouch(product.slug);
          trackChatProductClick(product.slug, position);
        }}
      >
        <div className="relative aspect-square bg-slate-100">
          {product.badge && (
            <span className="absolute left-1.5 top-1.5 z-10 rounded bg-accent px-1.5 py-0.5 text-[10px] font-bold text-white">
              {product.badge}
            </span>
          )}
          <ProductImage src={product.image} alt={product.name} variant="thumb" className="h-full w-full object-cover" />
        </div>
        <div className="p-2">
          <h3 className="line-clamp-2 min-h-[2.25rem] text-[11px] font-semibold leading-snug">{product.name}</h3>
        </div>
      </Link>
      <div className="flex gap-1 px-2 pb-2">
        <Link
          href={product.url}
          onClick={() => {
            markChatAssistedTouch(product.slug);
            trackChatProductClick(product.slug, position);
          }}
          className="flex-1 rounded-lg bg-primary px-2 py-1.5 text-center text-[10px] font-semibold text-white"
        >
          View
        </Link>
        <button
          type="button"
          disabled={product.available === false}
          onClick={() => onAddToCart(product)}
          className="flex-1 rounded-lg bg-nav px-2 py-1.5 text-[10px] font-semibold text-white disabled:opacity-50"
        >
          Enquire
        </button>
      </div>
    </article>
  );
}

export function ChatBlocks({
  blocks,
  onAction,
  onAddToCart,
  addingSlug,
}: {
  blocks: ChatBlock[];
  onAction: (action: ChatQuickAction) => void;
  onAddToCart: (product: AssistantProduct) => void;
  addingSlug?: string | null;
}) {
  return (
    <div className="space-y-2.5">
      {blocks.map((block, i) => {
        if (block.type === "text") {
          return (
            <p key={i} className="whitespace-pre-wrap break-words text-sm leading-relaxed text-white/95">
              {block.text}
            </p>
          );
        }
        if (block.type === "quick_actions") {
          return <QuickActionRow key={i} actions={block.actions} onAction={onAction} />;
        }
        if (block.type === "product_carousel") {
          return (
            <div key={i} className="space-y-2">
              {block.heading && <p className="text-xs text-white/70">{block.heading}</p>}
              <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:thin]">
                {block.products.map((product, idx) => (
                  <AssistantProductCard
                    key={product.slug}
                    product={product}
                    position={idx + 1}
                    onAddToCart={onAddToCart}
                    adding={addingSlug === product.slug}
                  />
                ))}
              </div>
              {block.viewAllHref && (
                <Link
                  href={block.viewAllHref}
                  className="inline-flex rounded-full bg-white/15 px-3 py-1.5 text-xs font-medium text-white hover:bg-white/25"
                  onClick={() => markChatAssistedTouch()}
                >
                  {block.viewAllLabel ?? "View all"}
                </Link>
              )}
            </div>
          );
        }
        if (block.type === "product_card") {
          return (
            <AssistantProductCard
              key={block.product.slug}
              product={block.product}
              position={1}
              onAddToCart={onAddToCart}
              adding={addingSlug === block.product.slug}
            />
          );
        }
        if (block.type === "category_card" || block.type === "link") {
          const href = block.type === "link" ? block.href : block.href;
          const label = block.type === "link" ? block.label : block.title;
          return (
            <Link
              key={i}
              href={href}
              className="block rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-sm text-white hover:bg-white/15"
              onClick={() => markChatAssistedTouch()}
            >
              {label}
              {block.type === "category_card" && block.subtitle && (
                <span className="mt-0.5 block text-xs text-white/60">{block.subtitle}</span>
              )}
            </Link>
          );
        }
        if (block.type === "comparison") {
          return (
            <div key={i} className="space-y-2">
              <p className="text-sm text-white/95">{block.summary}</p>
              <div className="-mx-1 flex gap-2 overflow-x-auto px-1">
                {block.products.map((product, idx) => (
                  <AssistantProductCard
                    key={product.slug}
                    product={product}
                    position={idx + 1}
                    onAddToCart={onAddToCart}
                    adding={addingSlug === product.slug}
                  />
                ))}
              </div>
            </div>
          );
        }
        if (block.type === "error") {
          return (
            <div key={i} className="rounded-xl bg-white/10 px-3 py-2 text-sm text-white/90">
              <p>{block.text}</p>
              {block.href && (
                <Link href={block.href} className="mt-2 inline-block text-xs font-semibold text-orange-200 underline">
                  {block.hrefLabel ?? "Browse spice"}
                </Link>
              )}
            </div>
          );
        }
        return null;
      })}
    </div>
  );
}
