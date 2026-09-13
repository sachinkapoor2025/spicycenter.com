"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type {
  AssistantProduct,
  ChatBlock,
  ChatConfig,
  ChatQuickAction,
  ChatResponse,
  ShoppingState,
} from "@spicycorner/shared";
import { DEFAULT_CHAT_CONFIG, invitationQuickActions, welcomeQuickActions } from "@spicycorner/shared";
import { api } from "@/lib/api";
import { useCart } from "@/lib/cart-context";
import { useMarket } from "@/lib/market-context";
import { getOrCreateSessionId } from "@/lib/session";
import {
  trackChatClose,
  trackChatMessage,
  trackChatOpen,
  trackChatSearch,
} from "@/lib/track";
import { markChatAssistedTouch } from "@/lib/attribution-store";
import { ChatBlocks, TypingIndicator } from "@/components/assistant/blocks";

const STORAGE_KEY = "hr_assistant_v1";
const DISMISS_KEY = "hr_assistant_invite_dismissed";
const OPEN_EVENT = "hr-open-assistant";

type UiMessage = {
  id: string;
  role: "user" | "assistant";
  text?: string;
  blocks?: ChatBlock[];
};

type Persisted = {
  messages: UiMessage[];
  shoppingState: ShoppingState;
};

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function pageContext(pathname: string, search: string) {
  const product = pathname.match(/^\/products\/([^/]+)/);
  if (product?.[1] && product[1] !== undefined) {
    return {
      path: pathname,
      productSlug: product[1],
      productName: product[1].replace(/-/g, " "),
    };
  }
  const category = pathname.match(/^\/categories\/([^/]+)/);
  if (category?.[1]) return { path: pathname, categorySlug: category[1] };
  const q = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search).get("search");
  if (pathname.startsWith("/products") && q) return { path: pathname, searchQuery: q };
  return { path: pathname };
}

function loadPersisted(): Persisted | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Persisted;
  } catch {
    return null;
  }
}

export function ShoppingAssistant() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { cart, addItem } = useCart();
  const { countryCode } = useMarket();
  const [config, setConfig] = useState<ChatConfig>(DEFAULT_CHAT_CONFIG);
  const [open, setOpen] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [invite, setInvite] = useState(false);
  const [messages, setMessages] = useState<UiMessage[]>([]);
  const [shoppingState, setShoppingState] = useState<ShoppingState>({});
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [addingSlug, setAddingSlug] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const openedRef = useRef(false);

  const onCheckout = pathname.startsWith("/checkout");
  const hidden = pathname.startsWith("/admin") || pathname.startsWith("/ses-email");

  useEffect(() => {
    const stored = loadPersisted();
    if (stored?.messages?.length) {
      setMessages(stored.messages);
      setShoppingState(stored.shoppingState ?? {});
    }
  }, []);

  useEffect(() => {
    if (hidden) return;
    const load = () => {
      api<{ config: ChatConfig }>("/config/chat", { revalidate: false, timeoutMs: 4000 })
        .then((data) => {
          if (data.config) setConfig(data.config);
        })
        .catch(() => {
          /* keep defaults */
        });
    };
    const t = window.setTimeout(load, 1500);
    return () => window.clearTimeout(t);
  }, [hidden]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ messages, shoppingState }));
  }, [messages, shoppingState]);

  useEffect(() => {
    if (open) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
      inputRef.current?.focus();
    }
  }, [open, messages, loading]);

  useEffect(() => {
    if (hidden || onCheckout || !config.enabled || !config.invitationEnabled) return;
    if (sessionStorage.getItem(DISMISS_KEY) === "1") return;
    const t = window.setTimeout(() => {
      if (!openedRef.current) setInvite(true);
    }, config.invitationDelayMs);
    return () => window.clearTimeout(t);
  }, [hidden, onCheckout, config.enabled, config.invitationEnabled, config.invitationDelayMs]);

  const send = useCallback(
    async (text: string, extraState?: ShoppingState) => {
      const trimmed = text.trim();
      if (!trimmed || loading) return;
      const userMsg: UiMessage = { id: uid(), role: "user", text: trimmed.slice(0, 500) };
      const nextMessages = [...messages, userMsg];
      setMessages(nextMessages);
      setInput("");
      setLoading(true);
      trackChatMessage();

      try {
        const history = nextMessages
          .filter((m) => m.text)
          .slice(-12)
          .map((m) => ({ role: m.role, content: m.text as string }));
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: history,
            page: pathname,
            sessionId: getOrCreateSessionId(),
            shoppingState: extraState ?? shoppingState,
            pageContext: pageContext(pathname, searchParams.toString()),
            cart: (cart?.items ?? []).slice(0, 8).map((i) => ({ slug: i.productSlug, name: i.name })),
            market: { countryCode },
          }),
        });
        const data = (await res.json()) as ChatResponse;
        setShoppingState(data.shoppingState ?? {});
        setMessages((prev) => [
          ...prev,
          { id: uid(), role: "assistant", blocks: data.blocks, text: data.message },
        ]);
        if (data.searchQuery) trackChatSearch(data.searchQuery, data.resultCount ?? 0, data.intent);
        trackChatMessage(data.intent);
      } catch {
        setMessages((prev) => [
          ...prev,
          {
            id: uid(),
            role: "assistant",
            blocks: [
              {
                type: "error",
                text: "I'm having trouble searching the products right now. You can browse our spice collection here.",
                href: "/products",
                hrefLabel: "Browse spice",
              },
            ],
          },
        ]);
      } finally {
        setLoading(false);
      }
    },
    [cart?.items, countryCode, loading, messages, pathname, searchParams, shoppingState]
  );

  const handleOpen = useCallback(async (prompt?: string, forceWelcome = false) => {
    setInvite(false);
    setMinimized(false);
    setOpen(true);
    if (!openedRef.current) {
      openedRef.current = true;
      trackChatOpen(pathname);
    }
    if (prompt) {
      await send(prompt);
      return;
    }
    if (forceWelcome || messages.length === 0) {
      setLoading(true);
      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: [],
            page: pathname,
            sessionId: getOrCreateSessionId(),
            shoppingState: forceWelcome ? { country: countryCode } : shoppingState,
            pageContext: pageContext(pathname, searchParams.toString()),
            cart: (cart?.items ?? []).slice(0, 8).map((i) => ({ slug: i.productSlug, name: i.name })),
            market: { countryCode },
          }),
        });
        const data = (await res.json()) as ChatResponse;
        setShoppingState(data.shoppingState ?? {});
        setMessages([{ id: uid(), role: "assistant", blocks: data.blocks, text: data.message }]);
      } catch {
        setMessages([
          {
            id: uid(),
            role: "assistant",
            blocks: [{ type: "text", text: "Hi! 🎃 What are you shopping for?" }, { type: "quick_actions", actions: welcomeQuickActions() }],
          },
        ]);
      } finally {
        setLoading(false);
      }
    }
  }, [cart?.items, countryCode, messages.length, pathname, searchParams, send, shoppingState]);

  useEffect(() => {
    const onOpen = (e: Event) => {
      const detail = (e as CustomEvent<{ prompt?: string }>).detail;
      void handleOpen(detail?.prompt);
    };
    window.addEventListener(OPEN_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_EVENT, onOpen);
  }, [handleOpen]);

  const handleClose = () => {
    setOpen(false);
    setMinimized(false);
    trackChatClose(pathname);
  };

  const startOver = () => {
    setMessages([]);
    setShoppingState({ country: countryCode });
    sessionStorage.removeItem(STORAGE_KEY);
    openedRef.current = true;
    void handleOpen(undefined, true);
  };

  const onAction = (action: ChatQuickAction) => {
    if (action.href && !action.message) return;
    if (action.href?.startsWith("http")) return;
    void send(action.message);
  };

  const onAddToCart = async (product: AssistantProduct) => {
    if (product.variants && product.variants.length > 1) {
      markChatAssistedTouch(product.slug);
      router.push(product.url);
      return;
    }
    setAddingSlug(product.slug);
    try {
      markChatAssistedTouch(product.slug);
      const vid = product.variants?.length === 1 ? product.variants[0]?.vid : undefined;
      await addItem(product.slug, 1, undefined, undefined, vid, "chat");
    } catch {
      /* cart error is visible in header */
    } finally {
      setAddingSlug(null);
    }
  };

  if (hidden || !config.enabled) return null;

  return (
    <>
      {invite && !open && !onCheckout && (
        <div className="fixed bottom-[7.5rem] right-5 z-[80] w-[min(100vw-2.5rem,280px)] rounded-2xl border border-white/15 bg-primary p-3 text-white shadow-2xl">
          <p className="text-sm font-medium">Need help finding something? 🎃</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {invitationQuickActions().map((a) => (
                <button
                  key={a.id}
                  type="button"
                  className="rounded-full bg-white/15 px-2.5 py-1 text-[11px] hover:bg-white/25"
                  onClick={() => void handleOpen(a.message)}
                >
                  {a.label}
                </button>
              ))}
          </div>
          <button
            type="button"
            className="mt-2 text-[11px] text-white/50 hover:text-white"
            onClick={() => {
              setInvite(false);
              sessionStorage.setItem(DISMISS_KEY, "1");
            }}
          >
            No thanks
          </button>
        </div>
      )}

      {open && !minimized && (
        <section
          role="dialog"
          aria-label="SpicyCorner personal shopping assistant"
          className="fixed z-[80] flex flex-col overflow-hidden border border-white/10 bg-primary shadow-2xl max-md:inset-x-0 max-md:bottom-0 max-md:top-[max(0.5rem,env(safe-area-inset-top))] max-md:rounded-t-2xl md:bottom-[5.5rem] md:right-5 md:h-[min(700px,calc(100vh-7rem))] md:w-[min(100vw-2rem,420px)] md:rounded-2xl"
        >
          <header className="flex items-center justify-between gap-2 border-b border-white/10 px-4 py-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white">SpicyCorner</p>
              <p className="truncate text-xs text-white/60">Personal spice Assistant</p>
              <p className="hidden truncate text-[11px] text-white/45 sm:block">
                Here to help you find the perfect spice products 🎃
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <button
                type="button"
                onClick={startOver}
                className="rounded-lg px-2 py-1 text-xs text-white/60 hover:bg-white/10 hover:text-white"
              >
                Start over
              </button>
              <button
                type="button"
                onClick={() => setMinimized(true)}
                className="rounded-lg p-1.5 text-white/70 hover:bg-white/10 hover:text-white"
                aria-label="Minimize assistant"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M5 12h14" />
                </svg>
              </button>
              <button
                type="button"
                onClick={handleClose}
                className="rounded-lg p-1.5 text-white/70 hover:bg-white/10 hover:text-white"
                aria-label="Close assistant"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
          </header>

          <div className="flex-1 space-y-3 overflow-y-auto px-3 py-4">
            {messages.map((m) => (
              <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[92%] rounded-2xl px-3.5 py-2.5 ${
                    m.role === "user" ? "rounded-br-md bg-nav text-white text-sm" : "rounded-bl-md bg-white/10 text-white"
                  }`}
                >
                  {m.role === "assistant" && m.blocks?.length ? (
                    <ChatBlocks
                      blocks={m.blocks}
                      onAction={onAction}
                      onAddToCart={onAddToCart}
                      addingSlug={addingSlug}
                    />
                  ) : (
                    <p className="whitespace-pre-wrap break-words text-sm">{m.text}</p>
                  )}
                </div>
              </div>
            ))}
            {loading && <TypingIndicator />}
            <div ref={bottomRef} />
          </div>

          <form
            className="border-t border-white/10 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
            onSubmit={(e) => {
              e.preventDefault();
              void send(input);
            }}
          >
            <div className="flex items-end gap-2">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void send(input);
                  }
                }}
                placeholder="Ask for a spice, decorations, a party…"
                rows={1}
                maxLength={500}
                disabled={loading}
                className="flex-1 resize-none rounded-xl border border-white/15 bg-white/10 px-3 py-2.5 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-nav disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="shrink-0 rounded-xl bg-nav px-3.5 py-2.5 text-white hover:bg-orange-600 disabled:opacity-40"
                aria-label="Send message"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M3.4 20.4l17.45-7.48a1 1 0 000-1.84L3.4 3.6a1 1 0 00-1.52 1.05l2.1 7.05H11a1 1 0 010 2H3.98l-2.1 7.05A1 1 0 003.4 20.4z" />
                </svg>
              </button>
            </div>
          </form>
        </section>
      )}

      {config.launcherEnabled && (
        <button
          type="button"
          onClick={() => (open && !minimized ? setMinimized(true) : void handleOpen())}
          aria-label={open && !minimized ? "Minimize spice assistant" : "Find your spice look"}
          aria-expanded={open && !minimized}
          className="fixed right-4 bottom-[4.75rem] z-[80] flex h-11 items-center justify-center gap-1.5 rounded-xl bg-primary px-3.5 text-white shadow-[0_4px_12px_rgba(24,58,104,0.45)] ring-2 ring-white/20 hover:scale-105 active:scale-95 transition-transform whitespace-nowrap"
        >
          {open && !minimized ? (
            <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M5 12h14" />
            </svg>
          ) : (
            <>
              <span aria-hidden className="shrink-0 text-base leading-none">
                🎃
              </span>
              <span className="text-sm font-semibold leading-none">Find your look</span>
            </>
          )}
        </button>
      )}
    </>
  );
}

export function openShoppingAssistant(prompt?: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(OPEN_EVENT, { detail: { prompt } }));
}
