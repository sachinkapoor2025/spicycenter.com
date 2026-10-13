import { LEAD_NOTIFY_STATUS, type LeadNotifyStatus } from "../schemas/lead";

export type LeadEmailResult = {
  ok: boolean;
  skipped?: boolean;
  error?: string;
};

export type LeadNotifyStamp = {
  notifyEmailStatus: LeadNotifyStatus;
  notifyEmailAt: string;
  notifyEmailError?: string;
};

/** Keep stored SMTP errors short and free of credential-like values. */
export function safeLeadNotifyError(error?: string): string | undefined {
  const trimmed = error?.trim();
  if (!trimmed) return undefined;
  return trimmed
    .replace(/(pass(?:word)?|smtp_pass|secret|api[_-]?key)\s*[:=]\s*\S+/gi, "$1=REDACTED")
    .slice(0, 400);
}

export function leadNotifyStamp(result: LeadEmailResult, at: string): LeadNotifyStamp {
  if (result.ok && !result.skipped) {
    return { notifyEmailStatus: LEAD_NOTIFY_STATUS.SENT, notifyEmailAt: at };
  }
  if (result.skipped) {
    return {
      notifyEmailStatus: LEAD_NOTIFY_STATUS.SKIPPED,
      notifyEmailAt: at,
      ...(safeLeadNotifyError(result.error) ? { notifyEmailError: safeLeadNotifyError(result.error) } : {}),
    };
  }
  return {
    notifyEmailStatus: LEAD_NOTIFY_STATUS.FAILED,
    notifyEmailAt: at,
    ...(safeLeadNotifyError(result.error) ? { notifyEmailError: safeLeadNotifyError(result.error) } : {}),
  };
}
