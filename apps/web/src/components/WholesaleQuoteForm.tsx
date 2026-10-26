"use client";

import { useEffect, useId, useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import {
  CATALOGUE_ENQUIRY_SAMPLE_NOTICE,
  ENQUIRY_KINDS,
  ENQUIRY_MARKETS,
  EVENT_TYPES,
  catalogueEnquiryLocationFields,
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
  enquiryIssueMessage,
  enquiryLeadWasPersisted,
  enquiryReferenceLabel,
  enquirySubmitButtonLabel,
  enquiryWhatsAppButtonLabel,
  interpretCatalogueEnquiryFailure,
  interpretCatalogueEnquirySuccess,
  isEnquiryResubmitLocked,
  planWhatsAppEnquiryHandoff,
  splitPrefillQuantity,
  type EnquiryFormValues,
  type EnquirySubmitOutcome,
} from "@/lib/catalogue-enquiry-form";
import {
  enquiryDestinationChoices,
  enquiryDestinationFromChoice,
  filterEnquiryDestinations,
  resolveEnquiryDestination,
  splitEnquiryContactName,
  type EnquiryDestinationChoice,
} from "@/lib/enquiry-destination";
import {
  ENQUIRY_PRODUCT_SEARCH_DEBOUNCE_MS,
  ENQUIRY_PRODUCT_SEARCH_MIN_LENGTH,
  OTHER_PRODUCT_LABEL,
  OTHER_PRODUCT_NOTE,
  addPickerProduct,
  enquiryProductBrowsePath,
  enquiryProductSearchPath,
  exactCatalogueSuggestion,
  normalizePickerName,
  pickerQuantityFieldsVisible,
  productsForSubmission,
  selectionFromCatalogue,
  selectionFromUnlisted,
  suggestionsFromCatalogueProducts,
  visiblePickerSuggestions,
  type EnquiryPickerSelection,
} from "@/lib/enquiry-product-picker";
import { getOrCreateSessionId } from "@/lib/session";
import { trackEnquiryEvent } from "@/lib/track";

const ENQUIRY_TYPE_OPTIONS = [
  { id: ENQUIRY_KINDS.COMMERCIAL_ORDER, label: "Commercial order" },
  { id: ENQUIRY_KINDS.SAMPLE_REQUEST, label: "Sample request" },
  { id: ENQUIRY_KINDS.SIMPLE_PRODUCT_ENQUIRY, label: "Generic product enquiry" },
] as const;

const fieldClass =
  "w-full min-w-0 border border-[#dcc9a8] rounded-lg px-3 py-2 text-base bg-paper focus:outline-none focus:ring-2 focus:ring-nav/40 focus:border-nav";

function initialValues(country: string): EnquiryFormValues {
  const destination = resolveEnquiryDestination(country);
  return {
    market: destination.market,
    kind: "",
    state: "",
    city: "",
    country: destination.country,
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    company: "",
    buyerType: "",
    message: "",
    website: "",
    products: [],
  };
}

function choiceClass(selected: boolean) {
  return `flex items-center gap-2 min-h-11 min-w-0 rounded-lg border px-3 py-2 cursor-pointer transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-nav ${
    selected
      ? "border-nav bg-[#fff6ee] shadow-[inset_0_0_0_1px_#c45c26]"
      : "border-[#e6d5bc] bg-paper hover:border-nav/60"
  }`;
}

function visibleEnquiryKind(kind: string): string {
  return ENQUIRY_TYPE_OPTIONS.find((option) => option.id === kind)?.label.toLowerCase() || "enquiry";
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
  const [form, setForm] = useState<EnquiryFormValues>(() => initialValues(defaultCountry));
  const [contactName, setContactName] = useState("");
  const [selections, setSelections] = useState<EnquiryPickerSelection[]>([]);
  const selectionsRef = useRef<EnquiryPickerSelection[]>([]);
  selectionsRef.current = selections;
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
    const destination = resolveEnquiryDestination(defaultCountry);
    if (!destination.market) return;
    setForm((current) => ({
      ...current,
      market: destination.market,
      country: destination.country,
      state: destination.market === ENQUIRY_MARKETS.INDIA ? current.state : "",
    }));
  }, [defaultCountry]);

  const locationFields = catalogueEnquiryLocationFields(form.market);
  const showQuantity = pickerQuantityFieldsVisible(form.kind);
  const showContainerNotice = shouldShowOverseasContainerDisclaimer(form.market, form.kind);
  const showSampleNotice = shouldShowSampleNotice(form.kind);
  const locked = forceLock || isEnquiryResubmitLocked(outcome);
  const spiceLabel =
    selections.find((row) => row.name.trim())?.name.trim() || defaultProduct.trim() || "Indian spices";

  function commitSelections(next: EnquiryPickerSelection[], userAction: boolean) {
    if (userAction) markStarted();
    selectionsRef.current = next;
    setSelections(next);
    setForm((current) => ({ ...current, products: productsForSubmission(next, current.kind) }));
  }

  function addSelection(row: EnquiryPickerSelection, userAction: boolean): boolean {
    const next = addPickerProduct(selectionsRef.current, row);
    if (!next) return false;
    commitSelections(next, userAction);
    return true;
  }

  function removeSelection(index: number) {
    commitSelections(
      selectionsRef.current.filter((_, rowIndex) => rowIndex !== index),
      true
    );
  }

  function updateSelection(index: number, field: "quantity" | "unit", value: string) {
    commitSelections(
      selectionsRef.current.map((row, rowIndex) => (rowIndex === index ? { ...row, [field]: value } : row)),
      true
    );
  }

  function markStarted() {
    if (formStarted) return;
    setFormStarted(true);
    trackEnquiryEvent(EVENT_TYPES.ENQUIRY_FORM_START, { form: "catalogue" });
  }

  function patch(partial: Partial<EnquiryFormValues>) {
    markStarted();
    setForm((current) => {
      const next = { ...current, ...partial };
      if (partial.kind !== undefined) {
        next.products = productsForSubmission(selectionsRef.current, next.kind);
      }
      return next;
    });
  }

  function updateContactName(value: string) {
    setContactName(value);
    const name = splitEnquiryContactName(value);
    patch({ firstName: name.firstName, lastName: name.lastName });
  }

  function selectDestination(choice: EnquiryDestinationChoice) {
    const destination = enquiryDestinationFromChoice(choice);
    patch({
      market: destination.market,
      country: destination.country,
      state: destination.market === ENQUIRY_MARKETS.INDIA ? form.state : "",
    });
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
    const kindLabel = visibleEnquiryKind(form.kind);
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

  const destinationIssue = enquiryIssueMessage(issues, "market") || enquiryIssueMessage(issues, "country");

  return (
    <form onSubmit={submit} className="grid gap-4 card-spice p-4 sm:p-5 overflow-x-clip" noValidate>
      {spiceLabel !== "Indian spices" ? (
        <p className="text-sm text-muted -mb-1">
          Enquiry for <span className="font-semibold text-primary">{spiceLabel}</span>
        </p>
      ) : null}
      <label className="hidden" aria-hidden="true">
        Website
        <input tabIndex={-1} autoComplete="off" value={form.website} onChange={(e) => patch({ website: e.target.value })} />
      </label>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label className="text-sm min-w-0">
          <span className="block mb-1 font-medium">Name*</span>
          <input className={fieldClass} autoComplete="name" value={contactName} onChange={(e) => updateContactName(e.target.value)} />
          {enquiryIssueMessage(issues, "firstName") ? (
            <span className="block mt-1 text-xs text-red-800">{enquiryIssueMessage(issues, "firstName")}</span>
          ) : null}
        </label>
        <label className="text-sm min-w-0">
          <span className="block mb-1 font-medium">Company*</span>
          <input className={fieldClass} autoComplete="organization" value={form.company} onChange={(e) => patch({ company: e.target.value })} />
          {enquiryIssueMessage(issues, "company") ? (
            <span className="block mt-1 text-xs text-red-800">{enquiryIssueMessage(issues, "company")}</span>
          ) : null}
        </label>
        <label className="text-sm min-w-0">
          <span className="block mb-1 font-medium">Phone*</span>
          <input type="tel" className={fieldClass} autoComplete="tel" value={form.phone} onChange={(e) => patch({ phone: e.target.value })} />
          {enquiryIssueMessage(issues, "phone") ? (
            <span className="block mt-1 text-xs text-red-800">{enquiryIssueMessage(issues, "phone")}</span>
          ) : null}
        </label>
        <label className="text-sm min-w-0">
          <span className="block mb-1 font-medium">Email*</span>
          <input type="email" className={fieldClass} autoComplete="email" value={form.email} onChange={(e) => patch({ email: e.target.value })} />
          {enquiryIssueMessage(issues, "email") ? (
            <span className="block mt-1 text-xs text-red-800">{enquiryIssueMessage(issues, "email")}</span>
          ) : null}
        </label>
      </div>

      <DestinationCountryField market={form.market} country={form.country} issue={destinationIssue} onSelect={selectDestination} />

      <fieldset className="grid gap-2 min-w-0 border-0 p-0">
        <legend className="text-sm font-medium text-primary mb-1 px-0">Enquiry type*</legend>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {ENQUIRY_TYPE_OPTIONS.map((option) => (
            <label key={option.id} className={choiceClass(form.kind === option.id)}>
              <input
                type="radio"
                name="kind"
                value={option.id}
                checked={form.kind === option.id}
                onChange={() => patch({ kind: option.id })}
                className="shrink-0 accent-[#c45c26]"
              />
              <span className="text-sm font-semibold text-primary leading-snug">{option.label}</span>
            </label>
          ))}
        </div>
        {enquiryIssueMessage(issues, "kind") ? (
          <p className="text-xs text-red-800">{enquiryIssueMessage(issues, "kind")}</p>
        ) : null}
        {showContainerNotice ? (
          <p className="rounded-lg border border-[#e6d5bc] bg-[#fffaf3] px-3 py-2 text-sm">{OVERSEAS_COMMERCIAL_MOQ_LABEL}</p>
        ) : null}
        {showSampleNotice ? (
          <p className="rounded-lg border border-[#e6d5bc] bg-[#fffaf3] px-3 py-2 text-sm">{CATALOGUE_ENQUIRY_SAMPLE_NOTICE}</p>
        ) : null}
      </fieldset>

      <div className="grid gap-2 min-w-0">
        <p className="text-sm font-medium text-primary">Products*</p>
        <CatalogueProductPicker
          selections={selections}
          issues={issues}
          showQuantity={showQuantity}
          defaultProduct={defaultProduct}
          defaultQuantity={defaultQuantity}
          onAdd={addSelection}
          onRemove={removeSelection}
          onUpdate={updateSelection}
        />
        {enquiryIssueMessage(issues, "products") ? (
          <p className="text-xs text-red-800">{enquiryIssueMessage(issues, "products")}</p>
        ) : null}
      </div>

      {locationFields.state ? (
        <div className="grid grid-cols-1 gap-3">
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
        </div>
      ) : null}

      <label className="text-sm min-w-0">
        <span className="block mb-1 font-medium">Message</span>
        <textarea
          value={form.message}
          onChange={(e) => patch({ message: e.target.value })}
          className={`${fieldClass} min-h-16`}
        />
      </label>

      {outcome?.status === "error" ? (
        <p role="alert" className="text-sm text-red-800">
          {outcome.message}
        </p>
      ) : null}
      <div className="grid grid-cols-1 gap-2 pb-[max(0.25rem,env(safe-area-inset-bottom))] sm:grid-cols-2">
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

function DestinationCountryField({
  market,
  country,
  issue,
  onSelect,
}: {
  market: string;
  country: string;
  issue: string;
  onSelect: (choice: EnquiryDestinationChoice) => void;
}) {
  const listId = useId();
  const inputId = useId();
  const choices = useMemo(() => enquiryDestinationChoices(), []);
  const selected = market === ENQUIRY_MARKETS.INDIA ? "India" : country;
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const matches = useMemo(() => filterEnquiryDestinations(open ? query : "", choices), [choices, open, query]);

  useEffect(() => {
    if (!open) return;
    document.getElementById(`${listId}-option-${active}`)?.scrollIntoView({ block: "nearest" });
  }, [active, listId, open]);

  function choose(choice: EnquiryDestinationChoice) {
    onSelect(choice);
    setOpen(false);
    setQuery("");
    setActive(0);
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (!open) {
        setOpen(true);
        setActive(0);
        return;
      }
      setActive((current) => Math.min(current + 1, Math.max(matches.length - 1, 0)));
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      if (!open) {
        setOpen(true);
        setActive(0);
        return;
      }
      setActive((current) => Math.max(current - 1, 0));
      return;
    }
    if (event.key === "Enter" && open) {
      event.preventDefault();
      if (matches[active]) choose(matches[active]);
      return;
    }
    if (event.key === "Escape") {
      setOpen(false);
      setQuery("");
    }
  }

  return (
    <div className="min-w-0">
      <label className="text-sm min-w-0" htmlFor={inputId}>
        <span className="block mb-1 font-medium">Destination country*</span>
        <input
          id={inputId}
          className={fieldClass}
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={open}
          aria-controls={listId}
          aria-activedescendant={open && matches[active] ? `${listId}-option-${active}` : undefined}
          aria-invalid={issue ? true : undefined}
          autoComplete="off"
          placeholder="Search countries"
          value={open ? query : selected}
          onFocus={() => {
            setOpen(true);
            setQuery("");
            setActive(0);
          }}
          onBlur={() => {
            window.setTimeout(() => {
              setOpen(false);
              setQuery("");
            }, 120);
          }}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
            setActive(0);
          }}
          onKeyDown={onKeyDown}
        />
      </label>
      {open ? (
        <ul id={listId} role="listbox" aria-label="Countries" className="mt-1 max-h-60 overflow-y-auto rounded-lg border border-[#e6d5bc] bg-paper p-1">
          {matches.length === 0 ? (
            <li className="px-2 py-2 text-sm text-muted">No matching country</li>
          ) : (
            matches.map((choice, index) => (
              <li key={choice.iso} role="presentation">
                <button
                  type="button"
                  id={`${listId}-option-${index}`}
                  role="option"
                  aria-selected={index === active}
                  className={`w-full min-h-11 rounded-md px-2 text-left text-sm font-medium text-primary ${
                    index === active ? "bg-[#fff6ee]" : "hover:bg-[#fff6ee]"
                  }`}
                  onMouseDown={(event) => event.preventDefault()}
                  onMouseEnter={() => setActive(index)}
                  onClick={() => choose(choice)}
                >
                  {choice.name}
                </button>
              </li>
            ))
          )}
        </ul>
      ) : null}
      {issue ? <p className="mt-1 text-xs text-red-800">{issue}</p> : null}
    </div>
  );
}

function CatalogueProductPicker({
  selections,
  issues,
  showQuantity,
  defaultProduct,
  defaultQuantity,
  onAdd,
  onRemove,
  onUpdate,
}: {
  selections: EnquiryPickerSelection[];
  issues: CatalogueEnquiryIssue[];
  showQuantity: boolean;
  defaultProduct: string;
  defaultQuantity: string;
  onAdd: (row: EnquiryPickerSelection, userAction: boolean) => boolean;
  onRemove: (index: number) => void;
  onUpdate: (index: number, field: "quantity" | "unit", value: string) => void;
}) {
  const listId = useId();
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const otherRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const requestId = useRef(0);
  const prefillApplied = useRef(false);
  const prefillUsed = useRef(false);
  const defaultsRef = useRef({ product: defaultProduct, quantity: defaultQuantity });
  const [query, setQuery] = useState(() => defaultProduct.trim());
  const [suggestions, setSuggestions] = useState<ReturnType<typeof suggestionsFromCatalogueProducts>>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [activeIndex, setActiveIndex] = useState(0);
  const [open, setOpen] = useState(false);
  const [otherOpen, setOtherOpen] = useState(false);
  const [otherName, setOtherName] = useState("");

  useEffect(() => {
    const previous = defaultsRef.current;
    if (previous.product === defaultProduct && previous.quantity === defaultQuantity) return;
    defaultsRef.current = { product: defaultProduct, quantity: defaultQuantity };
    prefillApplied.current = false;
    prefillUsed.current = false;
    setQuery(defaultProduct.trim());
  }, [defaultProduct, defaultQuantity]);

  useEffect(() => {
    const search = query.trim();
    const browsing = search.length < ENQUIRY_PRODUCT_SEARCH_MIN_LENGTH;
    const request = ++requestId.current;
    let cancelled = false;
    setStatus("loading");
    const timer = window.setTimeout(() => {
      const path = browsing ? enquiryProductBrowsePath() : enquiryProductSearchPath(search);
      void api<{ products?: Array<{ slug: string; name: string; tags?: string[] }> }>(path)
        .then((data) => {
          if (cancelled || request !== requestId.current) return;
          setSuggestions(suggestionsFromCatalogueProducts(data.products ?? []));
          setStatus("ready");
          setActiveIndex(0);
        })
        .catch(() => {
          if (cancelled || request !== requestId.current) return;
          setSuggestions([]);
          setStatus("error");
        });
    }, browsing ? 0 : ENQUIRY_PRODUCT_SEARCH_DEBOUNCE_MS);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [query]);

  function consumePrefill(queryText: string, chosenName: string) {
    if (prefillUsed.current) return undefined;
    const source = defaultProduct.trim();
    if (!source) return undefined;
    const related =
      normalizePickerName(queryText) === normalizePickerName(source) ||
      normalizePickerName(chosenName) === normalizePickerName(source);
    if (!related) return undefined;
    prefillUsed.current = true;
    const split = splitPrefillQuantity(defaultQuantity);
    if (!split.quantity && !split.unit) return undefined;
    return split;
  }

  useEffect(() => {
    if (prefillApplied.current || status !== "ready") return;
    const source = defaultProduct.trim();
    if (!source || normalizePickerName(query) !== normalizePickerName(source)) return;
    const exact = exactCatalogueSuggestion(query, suggestions);
    if (!exact) return;
    prefillApplied.current = true;
    const added = onAdd(selectionFromCatalogue(exact, consumePrefill(query, exact.name)), false);
    if (added) setQuery("");
  }, [defaultProduct, onAdd, query, status, suggestions]);

  const visible = visiblePickerSuggestions(suggestions, selections);
  const showOther = status === "ready" || status === "error" ? !exactCatalogueSuggestion(query, suggestions) : false;
  const optionCount = visible.length + (showOther && !otherOpen ? 1 : 0);

  useEffect(() => {
    if (!open) return;
    document.getElementById(`${listId}-option-${activeIndex}`)?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, listId, open]);

  function closePanel() {
    setOpen(false);
    setOtherOpen(false);
  }

  function chooseSuggestion(suggestion: (typeof visible)[number]) {
    const added = onAdd(selectionFromCatalogue(suggestion, consumePrefill(query, suggestion.name)), true);
    if (!added) return;
    setQuery("");
    setActiveIndex(0);
    setOtherOpen(false);
    inputRef.current?.focus();
  }

  function chooseOtherName(name: string) {
    const trimmed = name.trim();
    if (!trimmed) return;
    const added = onAdd(selectionFromUnlisted(trimmed, consumePrefill(query, trimmed)), true);
    if (!added) return;
    setQuery("");
    setOtherName("");
    setOtherOpen(false);
    setActiveIndex(0);
    inputRef.current?.focus();
  }

  function onSearchKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      closePanel();
      return;
    }
    if (!open) {
      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        setOpen(true);
        setActiveIndex(0);
      }
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((current) => Math.min(current + 1, Math.max(optionCount - 1, 0)));
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((current) => Math.max(current - 1, 0));
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      if (activeIndex >= 0 && activeIndex < visible.length) chooseSuggestion(visible[activeIndex]);
      else if (showOther && !otherOpen && activeIndex === visible.length) {
        setOtherOpen(true);
        setOtherName(query.trim());
        window.setTimeout(() => otherRef.current?.focus(), 0);
      }
    }
  }

  function keepPanelForFocus(next: EventTarget | null) {
    return Boolean(next && panelRef.current?.contains(next as Node));
  }

  return (
    <div
      className="grid gap-2 min-w-0"
      ref={panelRef}
      onBlur={(event) => {
        if (keepPanelForFocus(event.relatedTarget)) return;
        window.setTimeout(() => {
          if (keepPanelForFocus(document.activeElement)) return;
          closePanel();
        }, 120);
      }}
    >
      <label className="text-sm min-w-0" htmlFor={inputId}>
        <span className="block mb-1 font-medium">Search products</span>
        <input
          id={inputId}
          ref={inputRef}
          className={fieldClass}
          value={query}
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={open}
          aria-controls={listId}
          aria-activedescendant={open && optionCount > 0 ? `${listId}-option-${activeIndex}` : undefined}
          autoComplete="off"
          placeholder="Search spices, for example cumin"
          onFocus={() => {
            setOpen(true);
            setActiveIndex(0);
          }}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
            setOtherOpen(false);
            setActiveIndex(0);
          }}
          onKeyDown={onSearchKeyDown}
        />
      </label>

      {open ? (
        <div className="grid gap-1 rounded-lg border border-[#e6d5bc] bg-paper p-1">
          <p className="sr-only" aria-live="polite">
            {status === "loading"
              ? "Searching the catalogue"
              : status === "error"
                ? "Catalogue search is unavailable"
                : visible.length
                  ? `${visible.length} catalogue matches`
                  : "No catalogue match"}
          </p>
          {status === "loading" ? <p className="px-2 py-2 text-sm text-muted">Searching the catalogueâ€¦</p> : null}
          {status === "error" ? (
            <p className="px-2 py-2 text-sm text-red-800">Catalogue search is unavailable. Use Other to enter a product name.</p>
          ) : null}
          {status === "ready" && visible.length === 0 && suggestions.length > 0 ? (
            <p className="px-2 py-2 text-sm text-muted">Matching catalogue products are already in this enquiry.</p>
          ) : null}
          {status === "ready" && suggestions.length === 0 && query.trim() ? (
            <p className="px-2 py-2 text-sm text-muted">No catalogue product matches â€œ{query.trim()}â€.</p>
          ) : null}
          {visible.length > 0 ? (
            <ul id={listId} role="listbox" aria-label="Catalogue matches" className="grid max-h-60 overflow-y-auto">
              {visible.map((suggestion, index) => (
                <li key={suggestion.key} role="presentation">
                  <button
                    type="button"
                    id={`${listId}-option-${index}`}
                    role="option"
                    aria-selected={activeIndex === index}
                    className={`w-full min-h-11 rounded-md px-2 text-left text-sm font-semibold text-primary ${
                      activeIndex === index ? "bg-[#fff6ee]" : "hover:bg-[#fff6ee]"
                    }`}
                    onMouseDown={(event) => event.preventDefault()}
                    onMouseEnter={() => setActiveIndex(index)}
                    onClick={() => chooseSuggestion(suggestion)}
                  >
                    {suggestion.name}
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <div id={listId} />
          )}
          {showOther && !otherOpen ? (
            <button
              type="button"
              id={`${listId}-option-${visible.length}`}
              className={`min-h-11 w-full rounded-md border border-dashed px-2 text-left text-sm font-semibold text-nav ${
                activeIndex === visible.length ? "border-nav bg-[#fff6ee]" : "border-[#e6d5bc]"
              }`}
              onMouseDown={(event) => event.preventDefault()}
              onMouseEnter={() => setActiveIndex(visible.length)}
              onClick={() => {
                setOtherOpen(true);
                setOtherName(query.trim());
                window.setTimeout(() => otherRef.current?.focus(), 0);
              }}
            >
              {OTHER_PRODUCT_LABEL}
            </button>
          ) : null}
          {otherOpen ? (
            <div className="grid gap-2 p-2">
              <label className="text-sm min-w-0" htmlFor={`${inputId}-other`}>
                <span className="block mb-1 font-medium">Custom product name</span>
                <input
                  id={`${inputId}-other`}
                  ref={otherRef}
                  className={fieldClass}
                  value={otherName}
                  onChange={(event) => setOtherName(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      chooseOtherName(otherName);
                    }
                  }}
                />
              </label>
              <p className="text-xs text-muted">{OTHER_PRODUCT_NOTE}</p>
              <button
                type="button"
                className="min-h-11 rounded-md bg-nav px-3 text-sm font-semibold text-white disabled:opacity-50"
                disabled={!otherName.trim()}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => chooseOtherName(otherName)}
              >
                Add product
              </button>
            </div>
          ) : null}
        </div>
      ) : null}

      {selections.length > 0 ? (
        <ul className="grid gap-2">
          {selections.map((row, index) => (
            <li key={row.key} className="rounded-lg border border-[#e6d5bc] bg-[#fffaf3] px-3 py-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="min-w-0 flex-1 text-sm font-semibold text-primary leading-snug">{row.name}</span>
                {row.unlisted ? (
                  <span className="shrink-0 text-[11px] font-semibold uppercase tracking-wide text-muted">Other</span>
                ) : null}
                <button
                  type="button"
                  className="shrink-0 min-h-11 px-1 text-sm font-semibold text-nav"
                  onClick={() => onRemove(index)}
                >
                  Remove
                </button>
              </div>
              {showQuantity ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pb-1">
                  <label className="text-sm min-w-0">
                    <span className="block mb-1 font-medium">Quantity*</span>
                    <input
                      className={fieldClass}
                      value={row.quantity}
                      onChange={(event) => onUpdate(index, "quantity", event.target.value)}
                      placeholder="25"
                    />
                    {enquiryIssueMessage(issues, `products.${index}.quantity`) ? (
                      <span className="block mt-1 text-xs text-red-800">
                        {enquiryIssueMessage(issues, `products.${index}.quantity`)}
                      </span>
                    ) : null}
                  </label>
                  <label className="text-sm min-w-0">
                    <span className="block mb-1 font-medium">Unit*</span>
                    <input
                      className={fieldClass}
                      value={row.unit}
                      onChange={(event) => onUpdate(index, "unit", event.target.value)}
                      placeholder="kg, gm, or container"
                    />
                    {enquiryIssueMessage(issues, `products.${index}.unit`) ? (
                      <span className="block mt-1 text-xs text-red-800">
                        {enquiryIssueMessage(issues, `products.${index}.unit`)}
                      </span>
                    ) : null}
                  </label>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
