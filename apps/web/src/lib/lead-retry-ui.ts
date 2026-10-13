export type LeadRetryEmailResponse = {
  ok?: boolean;
  result?: "sent" | "failed" | "not_found" | "already_sent" | "not_applicable" | "retry_in_progress";
  leadId?: string;
  notifyEmailStatus?: "sent" | "failed" | "skipped";
  notifyEmailAt?: string;
  error?: string;
};

export type LeadNotifyPatch = {
  notifyEmailStatus: "sent" | "failed" | "skipped";
  notifyEmailAt?: string;
  notifyEmailError?: string;
};

export type LeadRetryUiOutcome =
  | { kind: "updated"; patch: LeadNotifyPatch; message: string; tone: "success" | "error" }
  | { kind: "unchanged"; message: string; tone: "error" };

export function leadRetryRequestBody(lead: { sessionId: string; createdAt: string }) {
  return { sessionId: lead.sessionId, createdAt: lead.createdAt };
}

export function leadRetryButtonState(retrying: boolean) {
  return {
    label: retrying ? "Retrying…" : "Retry Email",
    disabled: retrying,
    busy: retrying,
  };
}

export function interpretLeadRetryResponse(body: LeadRetryEmailResponse): LeadRetryUiOutcome {
  if (body.result === "sent") {
    return {
      kind: "updated",
      tone: "success",
      message: "Notification email sent.",
      patch: {
        notifyEmailStatus: "sent",
        notifyEmailAt: body.notifyEmailAt,
        notifyEmailError: undefined,
      },
    };
  }
  if (body.result === "failed") {
    return {
      kind: "updated",
      tone: "error",
      message: body.error?.trim() || "Notification could not be sent.",
      patch: {
        notifyEmailStatus: body.notifyEmailStatus === "skipped" ? "skipped" : "failed",
        notifyEmailAt: body.notifyEmailAt,
        notifyEmailError: body.error,
      },
    };
  }
  return {
    kind: "unchanged",
    tone: "error",
    message: leadRetryConflictMessage(body),
  };
}

export function leadRetryThrownMessage(err: unknown): string {
  const raw = err instanceof Error ? err.message.trim() : "";
  if (!raw || /^forbidden$/i.test(raw)) {
    return "You do not have permission to retry this notification.";
  }
  if (/lead not found/i.test(raw)) {
    return "This lead could not be found.";
  }
  return raw;
}

export function applyLeadRetryToList<T extends { leadId: string }>(
  leads: T[],
  leadId: string,
  patch: Partial<T>
): T[] {
  return leads.map((row) => (row.leadId === leadId ? { ...row, ...patch } : row));
}

function leadRetryConflictMessage(body: LeadRetryEmailResponse): string {
  if (body.error?.trim()) return body.error.trim();
  if (body.result === "already_sent") return "Notification was already sent for this lead.";
  if (body.result === "not_applicable") return "This lead has no notification payload to retry.";
  if (body.result === "retry_in_progress") return "A notification retry is already in progress.";
  if (body.result === "not_found") return "This lead could not be found.";
  return "Notification retry failed.";
}
