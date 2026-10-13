"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import {
  CATALOGUE_ENQUIRY_SAMPLE_NOTICE,
  ENQUIRY_KIND_OPTIONS,
  ENQUIRY_KINDS,
  ENQUIRY_MARKET_OPTIONS,
  ENQUIRY_MARKETS,
  EVENT_TYPES,
  catalogueEnquiryLocationFields,
  enquiryRequiresCommercialQuantity,
  formatEnquiryKind,
  shouldShowOverseasContainerDisclaimer,
  shouldShowSampleNotice,
  type CatalogueEnquiryIssue,
} from "@spicycorner/shared";
import { api } from "@/lib/api";
import {
  INDIA_STATES_AND_UTS,
  OVERSEAS_COMMERCIAL_MOQ_LABEL,
  PREFERRED_CONTACT_CHANNELS,
  WHATSAPP_HANDOFF_RECORDED_MESSAGE,
  buildCatalogueEnquiryRequest,
  catalogueEnquiryWhatsAppHref,
  emptyEnquiryProduct,
  enquiryIssueMessage,
  enquiryLeadWasPersisted,
  enquiryLocationFromCountryQuery,
  enquiryProductsFromQuery,
  enquiryReferenceLabel,
  enquirySubmitButtonLabel,
  enquiryWhatsAppButtonLabel,
  interpretCatalogueEnquiryFailure,
  interpretCatalogueEnquirySuccess,
  isEnquiryResubmitLocked,
  planWhatsAppEnquiryHandoff,
  type EnquiryFormProduct,
  type EnquiryFormValues,
  type EnquirySubmitOutcome,
} from "@/lib/catalogue-enquiry-form";
import { overseasCountryOptions } from "@/lib/country-codes";
import { getOrCreateSessionId } from "@/lib/session";
import { trackEnquiryEvent } from "@/lib/track";

const BUYER_TYPES = [
  "Wholesaler",
  "White Label",
  "Retailer",
  "Restaurant",
  "Foodservice Distributor",
  "Other",
] as const;

function initialValues(product: string, country: string, quantity: string): EnquiryFormValues {
  const location = enquiryLocationFromCountryQuery(country);
  return {
    market: location.market,
    kind: "",
    state: "",
    city: "",
    country: location.country,
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    company: "",
    buyerType: "",
    message: "",
    website: "",
    products: enquiryProductsFromQuery(product, quantity),
  };
}

function choiceClass(selected: boolean) {
  return `flex items-start gap-3 min-h-11 min-w-0 rounded-lg border px-3.5 py-3 cursor-pointer transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-nav ${
    selected
      ? "border-nav bg-[#fff6ee] shadow-[inset_0_0_0_1px_#c45c26]"
      : "border-[#e6d5bc] bg-paper hover:border-nav/60"
  }`;
}

function FormSection({
  title,
  required,
  divided = true,
  children,
}: {
  title: string;
  required?: boolean;
  divided?: boolean;
  children: ReactNode;
}) {
  return (
    <div className={divided ? "border-t border-[#e6d5bc] pt-5" : ""}>
      <fieldset className="grid gap-3 min-w-0 border-0 p-0">
        <legend className="text-xs font-semibold uppercase tracking-wide text-primary mb-1 px-0">
          {title}
          {required ? <span className="text-nav">*</span> : null}
        </legend>
        {children}
      </fieldset>
    </div>
  );
}

export function WholesaleQuoteForm({
  defaultProduct = "",
  defaultCountry = "",
  defaultQuantity = "",
}: {
  defaultProduct?: string;
  defaultCountry?: string;
  defaultQuantity?: string;
}) {
  const [form, setForm] = useState<EnquiryFormValues>(() =>
    initialValues(defaultProduct, defaultCountry, defaultQuantity)
  );
  const [formStarted, setFormStarted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [issues, setIssues] = useState<CatalogueEnquiryIssue[]>([]);
  const [outcome, setOutcome] = useState<EnquirySubmitOutcome | null>(null);
  const [submitChannel, setSubmitChannel] = useState<"form" | "whatsapp">("form");
  const [whatsappHref, setWhatsappHref] = useState("");
  const [forceLock, setForceLock] = useState(false);
  const submittingRef = useRef(false);

  useEffect(() => {
    trackEnquiryEvent(EVENT_TYPES.ENQUIRY_FORM_VIEW, { form: "catalogue" });
  }, []);

  useEffect(() => {
    setForm((current) => {
      const next = initialValues(defaultProduct, defaultCountry, defaultQuantity);
      return {
        ...current,
        market: next.market || current.market,
        country: next.country || current.country,
        products:
          next.products[0]?.name || next.products[0]?.quantity
            ? next.products
            : current.products.length
              ? current.products
              : next.products,
      };
    });
  }, [defaultProduct, defaultCountry, defaultQuantity]);

  const locationFields = catalogueEnquiryLocationFields(form.market);
  const requireQty = enquiryRequiresCommercialQuantity(form.kind);
  const showContainerNotice = shouldShowOverseasContainerDisclaimer(form.market, form.kind);
  const showSampleNotice = shouldShowSampleNotice(form.kind);
  const locked = forceLock || isEnquiryResubmitLocked(outcome);
  const countryChoices = useMemo(() => overseasCountryOptions(), []);
  const spiceLabel = form.products.find((row) => row.name.trim())?.name.trim() || "Indian spices";

  function markStarted() {
    if (formStarted) return;
    setFormStarted(true);
    trackEnquiryEvent(EVENT_TYPES.ENQUIRY_FORM_START, { form: "catalogue" });
  }

  function patch(partial: Partial<EnquiryFormValues>) {
    markStarted();
    setForm((current) => ({ ...current, ...partial }));
  }

  function updateMarket(market: string) {
    patch({
      market,
      state: market === ENQUIRY_MARKETS.INDIA ? form.state : "",
      country: market === ENQUIRY_MARKETS.OVERSEAS ? form.country : "",
    });
  }

  function updateProduct(index: number, field: keyof EnquiryFormProduct, value: string) {
    markStarted();
    setForm((current) => ({
      ...current,
      products: current.products.map((row, rowIndex) =>
        rowIndex === index ? { ...row, [field]: value } : row
      ),
    }));
  }

  function addProduct() {
    markStarted();
    setForm((current) => ({ ...current, products: [...current.products, emptyEnquiryProduct()] }));
  }

  function removeProduct(index: number) {
    markStarted();
    setForm((current) => ({
      ...current,
      products: current.products.length > 1 ? current.products.filter((_, rowIndex) => rowIndex !== index) : current.products,
    }));
  }

  function enquiryPage() {
    return typeof window !== "undefined" ? `${window.location.pathname}${window.location.search}` : "/enquiry";
  }

  function openWhatsAppIfAllowed(href: string) {
    if (typeof window === "undefined" || !href) return;
    window.open(href, "_blank", "noopener,noreferrer");
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (submittingRef.current || locked) return;
    submittingRef.current = true;
    setLoading(true);
    setSubmitChannel("form");
    setOutcome(null);
    const built = buildCatalogueEnquiryRequest(
      form,
      getOrCreateSessionId(),
      enquiryPage(),
      { preferredContactChannel: PREFERRED_CONTACT_CHANNELS.EMAIL }
    );
    if (!built.ok) {
      setIssues(built.issues);
      setOutcome({ status: "error", message: built.issues[0]?.message || "Check the highlighted fields." });
      trackEnquiryEvent(EVENT_TYPES.ENQUIRY_VALIDATION_ERROR, { form: "catalogue" });
      submittingRef.current = false;
      setLoading(false);
      return;
    }
    setIssues([]);
    let keepLocked = false;
    try {
      const body = await api<unknown>("/leads", {
        method: "POST",
        sessionId: String(built.body.sessionId),
        body: JSON.stringify(built.body),
      });
      const next = interpretCatalogueEnquirySuccess(body);
      keepLocked = isEnquiryResubmitLocked(next);
      setOutcome(next);
      if (next.status === "sent" || next.status === "saved_unnotified") {
        trackEnquiryEvent(EVENT_TYPES.ENQUIRY_FORM_SUBMIT, { form: "catalogue" });
      } else {
        trackEnquiryEvent(EVENT_TYPES.ENQUIRY_VALIDATION_ERROR, { form: "catalogue" });
      }
    } catch (err) {
      const next = interpretCatalogueEnquiryFailure(err);
      keepLocked = isEnquiryResubmitLocked(next);
      setOutcome(next);
      trackEnquiryEvent(
        next.status === "saved_unnotified" ? EVENT_TYPES.ENQUIRY_FORM_SUBMIT : EVENT_TYPES.ENQUIRY_VALIDATION_ERROR,
        { form: "catalogue" }
      );
    } finally {
      if (!keepLocked) submittingRef.current = false;
      setLoading(false);
    }
  }

  async function submitWhatsApp() {
    if (submittingRef.current || locked) return;
    submittingRef.current = true;
    setLoading(true);
    setSubmitChannel("whatsapp");
    setOutcome(null);
    setWhatsappHref("");
    const built = buildCatalogueEnquiryRequest(
      form,
      getOrCreateSessionId(),
      enquiryPage(),
      { preferredContactChannel: PREFERRED_CONTACT_CHANNELS.WHATSAPP }
    );
    if (!built.ok) {
      setIssues(built.issues);
      setOutcome({ status: "error", message: built.issues[0]?.message || "Check the highlighted fields." });
      trackEnquiryEvent(EVENT_TYPES.ENQUIRY_VALIDATION_ERROR, { form: "catalogue" });
      submittingRef.current = false;
      setLoading(false);
      return;
    }
    setIssues([]);
    let keepLocked = false;
    try {
      const body = await api<unknown>("/leads", {
        method: "POST",
        sessionId: String(built.body.sessionId),
        body: JSON.stringify(built.body),
      });
      const next = interpretCatalogueEnquirySuccess(body);
      const plan = planWhatsAppEnquiryHandoff(next);
      keepLocked = plan.lockResubmit;
      setForceLock(plan.lockResubmit);
      if (plan.openWhatsApp) {
        const href = catalogueEnquiryWhatsAppHref(form);
        setWhatsappHref(href);
        setOutcome(next);
        openWhatsAppIfAllowed(href);
        trackEnquiryEvent(EVENT_TYPES.ENQUIRY_FORM_SUBMIT, { form: "catalogue" });
      } else {
        setOutcome({ status: "error", message: plan.buyerMessage });
        trackEnquiryEvent(EVENT_TYPES.ENQUIRY_VALIDATION_ERROR, { form: "catalogue" });
      }
    } catch (err) {
      const next = interpretCatalogueEnquiryFailure(err);
      const plan = planWhatsAppEnquiryHandoff(next);
      keepLocked = plan.lockResubmit;
      setForceLock(plan.lockResubmit);
      if (plan.openWhatsApp) {
        const href = catalogueEnquiryWhatsAppHref(form);
        setWhatsappHref(href);
        setOutcome(next);
        openWhatsAppIfAllowed(href);
        trackEnquiryEvent(EVENT_TYPES.ENQUIRY_FORM_SUBMIT, { form: "catalogue" });
      } else {
        setOutcome({ status: "error", message: plan.buyerMessage });
        trackEnquiryEvent(EVENT_TYPES.ENQUIRY_VALIDATION_ERROR, { form: "catalogue" });
      }
    } finally {
      if (!keepLocked) submittingRef.current = false;
      setLoading(false);
    }
  }

  const fieldClass =
    "w-full border border-[#dcc9a8] rounded-lg px-3 py-2.5 text-base bg-paper focus:outline-none focus:ring-2 focus:ring-nav/40 focus:border-nav";

  if (submitChannel === "whatsapp" && outcome && enquiryLeadWasPersisted(outcome)) {
    const reference = enquiryReferenceLabel(outcome);
    return (
      <div className="card-spice p-5 sm:p-6 grid gap-3">
        <p>{WHATSAPP_HANDOFF_RECORDED_MESSAGE}</p>
        {reference ? (
          <p className="text-sm">
            Reference: <span className="font-semibold">{reference}</span>
          </p>
        ) : null}
        {whatsappHref ? (
          <a
            href={whatsappHref}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-outline w-full sm:w-auto justify-center min-h-12 text-center"
          >
            Open WhatsApp
          </a>
        ) : null}
      </div>
    );
  }

  if (outcome?.status === "sent") {
    const kindLabel = formatEnquiryKind(form.kind).toLowerCase() || "enquiry";
    return (
      <p className="card-spice p-5 sm:p-6">
        Thank you, {form.firstName}. We have your {kindLabel}
        {spiceLabel !== "Indian spices" ? ` for ${spiceLabel}` : ""}
        {form.products.length > 1 ? ` and ${form.products.length - 1} more product${form.products.length > 2 ? "s" : ""}` : ""}. We
        reply with availability. This catalogue does not publish a price or a delivery date.
      </p>
    );
  }

  if (outcome?.status === "saved_unnotified") {
    const reference = enquiryReferenceLabel(outcome);
    return (
      <div className="card-spice p-5 sm:p-6 grid gap-3">
        <p>
          {outcome.message} This is not a checkout confirmation. Please keep this reference if you contact us.
        </p>
        {reference ? (
          <p className="text-sm">
            Reference: <span className="font-semibold">{reference}</span>
          </p>
        ) : null}
        <p className="text-sm text-muted">This enquiry was already saved, so it cannot be sent again from this form.</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="grid card-spice p-4 sm:p-6 overflow-x-clip" noValidate>
      {spiceLabel !== "Indian spices" ? (
        <p className="text-sm text-muted pb-4">
          Enquiry for <span className="font-semibold text-primary">{spiceLabel}</span>
        </p>
      ) : null}
      <label className="hidden" aria-hidden="true">
        Website
        <input tabIndex={-1} autoComplete="off" value={form.website} onChange={(e) => patch({ website: e.target.value })} />
      </label>

      <FormSection title="Market" required divided={false}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {ENQUIRY_MARKET_OPTIONS.map((option) => (
            <label key={option.id} className={choiceClass(form.market === option.id)}>
              <input
                type="radio"
                name="market"
                value={option.id}
                checked={form.market === option.id}
                onChange={() => updateMarket(option.id)}
                className="mt-0.5 shrink-0 accent-[#c45c26]"
              />
              <span className="text-sm font-semibold text-primary leading-snug">{option.label}</span>
            </label>
          ))}
        </div>
        {enquiryIssueMessage(issues, "market") ? (
          <p className="text-xs text-red-800">{enquiryIssueMessage(issues, "market")}</p>
        ) : null}
      </FormSection>

      <FormSection title="Enquiry type" required>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          {ENQUIRY_KIND_OPTIONS.map((option) => (
            <label key={option.id} className={choiceClass(form.kind === option.id)}>
              <input
                type="radio"
                name="kind"
                value={option.id}
                checked={form.kind === option.id}
                onChange={() => patch({ kind: option.id })}
                className="mt-0.5 shrink-0 accent-[#c45c26]"
              />
              <span className="text-sm font-semibold text-primary leading-snug">{option.label}</span>
            </label>
          ))}
        </div>
        {enquiryIssueMessage(issues, "kind") ? (
          <p className="text-xs text-red-800">{enquiryIssueMessage(issues, "kind")}</p>
        ) : null}
        {showContainerNotice ? (
          <p className="rounded-lg border border-[#e6d5bc] bg-[#fffaf3] px-3 py-2.5 text-sm">{OVERSEAS_COMMERCIAL_MOQ_LABEL}</p>
        ) : null}
        {showSampleNotice ? (
          <p className="rounded-lg border border-[#e6d5bc] bg-[#fffaf3] px-3 py-2.5 text-sm">{CATALOGUE_ENQUIRY_SAMPLE_NOTICE}</p>
        ) : null}
      </FormSection>

      <FormSection title="Products">
        {form.products.map((row, index) => (
          <div key={index} className="grid gap-3 rounded-lg border border-[#e6d5bc] bg-[#fffaf3] p-3">
            <label className="text-sm min-w-0">
              <span className="block mb-1 font-medium">Product*</span>
              <input
                className={fieldClass}
                value={row.name}
                onChange={(e) => updateProduct(index, "name", e.target.value)}
                placeholder="Cumin whole"
              />
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="text-sm min-w-0">
                <span className="block mb-1 font-medium">Quantity{requireQty ? "*" : ""}</span>
                <input
                  className={fieldClass}
                  value={row.quantity}
                  onChange={(e) => updateProduct(index, "quantity", e.target.value)}
                  placeholder={form.kind === ENQUIRY_KINDS.COMMERCIAL_ORDER ? "25" : "Optional"}
                />
                {enquiryIssueMessage(issues, `products.${index}.quantity`) ? (
                  <span className="block mt-1 text-xs text-red-800">{enquiryIssueMessage(issues, `products.${index}.quantity`)}</span>
                ) : null}
              </label>
              <label className="text-sm min-w-0">
                <span className="block mb-1 font-medium">Unit{requireQty ? "*" : ""}</span>
                <input
                  className={fieldClass}
                  value={row.unit}
                  onChange={(e) => updateProduct(index, "unit", e.target.value)}
                  placeholder={form.kind === ENQUIRY_KINDS.COMMERCIAL_ORDER ? "kg, gm, or container" : "Optional"}
                />
                {enquiryIssueMessage(issues, `products.${index}.unit`) ? (
                  <span className="block mt-1 text-xs text-red-800">{enquiryIssueMessage(issues, `products.${index}.unit`)}</span>
                ) : null}
              </label>
            </div>
            {form.products.length > 1 ? (
              <button type="button" className="text-sm text-nav font-semibold justify-self-start min-h-11 px-1" onClick={() => removeProduct(index)}>
                Remove product
              </button>
            ) : null}
          </div>
        ))}
        {enquiryIssueMessage(issues, "products") ? (
          <p className="text-xs text-red-800">{enquiryIssueMessage(issues, "products")}</p>
        ) : null}
        <button
          type="button"
          className="inline-flex items-center justify-center min-h-11 w-full sm:w-auto rounded-lg border border-dashed border-nav px-4 text-sm font-semibold text-nav hover:bg-[#fff6ee]"
          onClick={addProduct}
        >
          + Add another product
        </button>
      </FormSection>

      <FormSection title="Your details">
        {form.market ? (
          <div className="grid gap-3 min-w-0">
            {locationFields.state ? (
              <label className="text-sm min-w-0">
                <span className="block mb-1 font-medium">State or union territory*</span>
                <select className={fieldClass} value={form.state} onChange={(e) => patch({ state: e.target.value })}>
                  <option value="">Please select</option>
                  {INDIA_STATES_AND_UTS.map((state) => (
                    <option key={state} value={state}>
                      {state}
                    </option>
                  ))}
                </select>
                {enquiryIssueMessage(issues, "state") ? (
                  <span className="block mt-1 text-xs text-red-800">{enquiryIssueMessage(issues, "state")}</span>
                ) : null}
              </label>
            ) : null}
            {locationFields.country ? (
              <label className="text-sm min-w-0">
                <span className="block mb-1 font-medium">Destination country*</span>
                <select className={fieldClass} value={form.country} onChange={(e) => patch({ country: e.target.value })}>
                  <option value="">Please select</option>
                  {countryChoices.map((row) => (
                    <option key={row.iso} value={row.name}>
                      {row.name}
                    </option>
                  ))}
                  {form.country && !countryChoices.some((row) => row.name === form.country) ? (
                    <option value={form.country}>{form.country}</option>
                  ) : null}
                </select>
                {enquiryIssueMessage(issues, "country") ? (
                  <span className="block mt-1 text-xs text-red-800">{enquiryIssueMessage(issues, "country")}</span>
                ) : null}
              </label>
            ) : null}
            {locationFields.city ? (
              <label className="text-sm min-w-0">
                <span className="block mb-1 font-medium">City*</span>
                <input className={fieldClass} value={form.city} onChange={(e) => patch({ city: e.target.value })} />
                {enquiryIssueMessage(issues, "city") ? (
                  <span className="block mt-1 text-xs text-red-800">{enquiryIssueMessage(issues, "city")}</span>
                ) : null}
              </label>
            ) : null}
          </div>
        ) : null}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="text-sm min-w-0">
            <span className="block mb-1 font-medium">First name*</span>
            <input className={fieldClass} value={form.firstName} onChange={(e) => patch({ firstName: e.target.value })} />
            {enquiryIssueMessage(issues, "firstName") ? (
              <span className="block mt-1 text-xs text-red-800">{enquiryIssueMessage(issues, "firstName")}</span>
            ) : null}
          </label>
          <label className="text-sm min-w-0">
            <span className="block mb-1 font-medium">Last name</span>
            <input className={fieldClass} value={form.lastName} onChange={(e) => patch({ lastName: e.target.value })} />
          </label>
          <label className="text-sm min-w-0">
            <span className="block mb-1 font-medium">Email*</span>
            <input type="email" className={fieldClass} value={form.email} onChange={(e) => patch({ email: e.target.value })} />
            {enquiryIssueMessage(issues, "email") ? (
              <span className="block mt-1 text-xs text-red-800">{enquiryIssueMessage(issues, "email")}</span>
            ) : null}
          </label>
          <label className="text-sm min-w-0">
            <span className="block mb-1 font-medium">Phone number*</span>
            <input type="tel" className={fieldClass} value={form.phone} onChange={(e) => patch({ phone: e.target.value })} />
            {enquiryIssueMessage(issues, "phone") ? (
              <span className="block mt-1 text-xs text-red-800">{enquiryIssueMessage(issues, "phone")}</span>
            ) : null}
          </label>
        </div>
        <label className="text-sm min-w-0">
          <span className="block mb-1 font-medium">Company name*</span>
          <input className={fieldClass} value={form.company} onChange={(e) => patch({ company: e.target.value })} />
          {enquiryIssueMessage(issues, "company") ? (
            <span className="block mt-1 text-xs text-red-800">{enquiryIssueMessage(issues, "company")}</span>
          ) : null}
        </label>
        <label className="text-sm min-w-0">
          <span className="block mb-1 font-medium">What best describes you?*</span>
          <select className={fieldClass} value={form.buyerType} onChange={(e) => patch({ buyerType: e.target.value })}>
            <option value="">Please select</option>
            {BUYER_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
          {enquiryIssueMessage(issues, "buyerType") ? (
            <span className="block mt-1 text-xs text-red-800">{enquiryIssueMessage(issues, "buyerType")}</span>
          ) : null}
        </label>
        <label className="text-sm min-w-0">
          <span className="block mb-1 font-medium">Message</span>
          <textarea
            value={form.message}
            onChange={(e) => patch({ message: e.target.value })}
            className={`${fieldClass} min-h-24`}
          />
        </label>
      </FormSection>

      {outcome?.status === "error" ? (
        <p role="alert" className="text-sm text-red-800 pb-3">
          {outcome.message}
        </p>
      ) : null}
      <div className="grid grid-cols-1 gap-3 pt-1 pb-[max(0.25rem,env(safe-area-inset-bottom))] sm:grid-cols-2">
        <button
          type="submit"
          disabled={loading || locked}
          className="btn-primary !w-full justify-center min-h-12 disabled:opacity-50"
        >
          {enquirySubmitButtonLabel(loading && submitChannel === "form", locked)}
        </button>
        <button
          type="button"
          disabled={loading || locked}
          onClick={submitWhatsApp}
          className="btn-outline w-full justify-center min-h-12 text-center disabled:opacity-50"
        >
          {enquiryWhatsAppButtonLabel(loading && submitChannel === "whatsapp", locked)}
        </button>
      </div>
    </form>
  );
}
