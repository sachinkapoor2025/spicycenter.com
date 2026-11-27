export interface AuthUser {
  email: string;
  name?: string;
  token: string;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  /** Cognito `email` group — /ses-email module */
  isEmailMarketer: boolean;
  /** Cognito `vendor` group — vendor portal with server-side isolation */
  isVendor: boolean;
  vendorSlug?: string;
}

const STORAGE_KEY = "hr_ecom_auth";

/** Read the saved session without loading the Cognito SDK. */
export function loadStoredAuth(): AuthUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AuthUser;
    return {
      ...parsed,
      isEmailMarketer: Boolean(parsed.isEmailMarketer ?? parsed.isSuperAdmin),
      isVendor: Boolean(parsed.isVendor),
    };
  } catch {
    return null;
  }
}

export function storeAuth(user: AuthUser | null) {
  if (typeof window === "undefined") return;
  if (user) localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
  else localStorage.removeItem(STORAGE_KEY);
}
