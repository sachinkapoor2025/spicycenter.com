"use client";

import {
  CognitoUserPool,
  CognitoUser,
  AuthenticationDetails,
  CognitoUserAttribute,
} from "amazon-cognito-identity-js";

const poolId = process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID;
const clientId = process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID;
const devAuth = process.env.NEXT_PUBLIC_DEV_AUTH === "true";

const userPool =
  poolId && clientId
    ? new CognitoUserPool({ UserPoolId: poolId, ClientId: clientId })
    : null;

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

export interface RegisterResult {
  userConfirmed: boolean;
  deliveryDestination?: string;
  deliveryMedium?: string;
}

const STORAGE_KEY = "hr_ecom_auth";

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
  if (user) localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
  else localStorage.removeItem(STORAGE_KEY);
}

export function login(email: string, password: string): Promise<AuthUser> {
  if (!userPool && devAuth) {
    const isSuperAdmin = email.toLowerCase().includes("superadmin");
    const isVendor = !isSuperAdmin && email.toLowerCase().includes("vendor");
    const isAdmin = isSuperAdmin || (!isVendor && email.toLowerCase().includes("admin"));
    const isEmailMarketer =
      isSuperAdmin || email.toLowerCase().includes("email") || email.toLowerCase().includes("ses");
    const role = isSuperAdmin
      ? "super-admin"
      : isVendor
        ? "vendor"
        : isEmailMarketer && !isAdmin
          ? "email"
          : isAdmin
            ? "admin"
            : "customer";
    const user: AuthUser = {
      email,
      token: `dev:${email}:${role}`,
      isAdmin,
      isSuperAdmin,
      isEmailMarketer,
      isVendor,
    };
    storeAuth(user);
    return Promise.resolve(user);
  }

  if (!userPool) {
    return Promise.reject(new Error("Auth not configured. Set Cognito env vars or enable dev auth."));
  }

  return new Promise((resolve, reject) => {
    const user = new CognitoUser({ Username: email, Pool: userPool });
    const details = new AuthenticationDetails({ Username: email, Password: password });

    user.authenticateUser(details, {
      onSuccess: (session) => {
        const token = session.getIdToken().getJwtToken();
        const payload = session.getIdToken().decodePayload();
        const groups: string[] = payload["cognito:groups"] ?? [];
        const isSuperAdmin = groups.includes("super-admin");
        const authUser: AuthUser = {
          email,
          name: payload.name as string | undefined,
          token,
          isSuperAdmin,
          isAdmin: groups.includes("admin") || isSuperAdmin,
          isEmailMarketer: groups.includes("email") || isSuperAdmin,
          isVendor: groups.includes("vendor"),
        };
        storeAuth(authUser);
        resolve(authUser);
      },
      onFailure: (err) => reject(err),
    });
  });
}

export function register(
  email: string,
  password: string,
  name?: string
): Promise<RegisterResult> {
  if (!userPool && devAuth) {
    return Promise.resolve({ userConfirmed: true });
  }

  if (!userPool) {
    return Promise.reject(new Error("Auth not configured."));
  }

  const attrs: CognitoUserAttribute[] = [
    new CognitoUserAttribute({ Name: "email", Value: email }),
  ];
  if (name) attrs.push(new CognitoUserAttribute({ Name: "name", Value: name }));

  return new Promise((resolve, reject) => {
    userPool.signUp(email, password, attrs, [], (err, result) => {
      if (err) reject(err);
      else {
        const delivery = result?.codeDeliveryDetails;
        resolve({
          userConfirmed: result?.userConfirmed ?? false,
          deliveryDestination: delivery?.Destination,
          deliveryMedium: delivery?.DeliveryMedium,
        });
      }
    });
  });
}

export function logout() {
  if (userPool) {
    const user = userPool.getCurrentUser();
    user?.signOut();
  }
  storeAuth(null);
}

export function isCognitoConfigured(): boolean {
  return !!userPool;
}

export function isDevAuthEnabled(): boolean {
  return devAuth && !userPool;
}

export function isUnconfirmedError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const e = err as { code?: string; message?: string };
  return (
    e.code === "UserNotConfirmedException" ||
    (typeof e.message === "string" && e.message.toLowerCase().includes("not confirmed"))
  );
}

function getAuthErrorCode(err: unknown): string | undefined {
  if (!err || typeof err !== "object") return undefined;
  return (err as { code?: string; name?: string }).code ?? (err as { name?: string }).name;
}

export function formatAuthError(err: unknown): string {
  const code = getAuthErrorCode(err);
  if (isUnconfirmedError(err)) {
    return "Your email is not verified yet. Enter the code we sent you below.";
  }
  if (code === "CodeDeliveryFailureException") {
    return "Cognito could not send the verification email. Please try resend; if it still fails, contact support.";
  }
  if (code === "LimitExceededException") {
    return "Too many attempts. Please wait a few minutes, then try again.";
  }
  if (code === "UsernameExistsException") {
    return "An account already exists for this email. Log in, or use resend verification code if it is not verified yet.";
  }
  if (code === "InvalidPasswordException") {
    return "Password must be at least 8 characters and include uppercase, lowercase, and a number.";
  }
  if (code === "CodeMismatchException" || code === "ExpiredCodeException") {
    return "That reset code is invalid or expired. Request a new code and try again.";
  }
  if (code === "UserNotFoundException") {
    return "If an account exists for that email, a reset code has been sent.";
  }
  if (code === "InvalidParameterException") {
    return "Check that your email is verified and try again. Unverified accounts must confirm email first.";
  }
  if (err instanceof Error && err.message) return err.message;
  return "Authentication failed";
}

export function confirmSignUp(email: string, code: string): Promise<void> {
  if (!userPool && devAuth) return Promise.resolve();
  if (!userPool) return Promise.reject(new Error("Auth not configured."));

  return new Promise((resolve, reject) => {
    const user = new CognitoUser({ Username: email, Pool: userPool });
    user.confirmRegistration(code.trim(), true, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

export function resendConfirmationCode(email: string): Promise<void> {
  if (!userPool && devAuth) return Promise.resolve();
  if (!userPool) return Promise.reject(new Error("Auth not configured."));

  return new Promise((resolve, reject) => {
    const user = new CognitoUser({ Username: email, Pool: userPool });
    user.resendConfirmationCode((err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

export type ForgotPasswordDelivery = {
  deliveryMedium?: string;
  destination?: string;
};

/** Step 1: ask Cognito to email a password-reset code. */
export function forgotPassword(email: string): Promise<ForgotPasswordDelivery> {
  if (!userPool && devAuth) {
    return Promise.resolve({ deliveryMedium: "EMAIL", destination: email });
  }
  if (!userPool) return Promise.reject(new Error("Auth not configured."));

  return new Promise((resolve, reject) => {
    const user = new CognitoUser({ Username: email.trim().toLowerCase(), Pool: userPool });
    user.forgotPassword({
      onSuccess: () => resolve({}),
      onFailure: (err) => reject(err),
      inputVerificationCode: (data) => {
        resolve({
          deliveryMedium: data?.DeliveryMedium,
          destination: data?.Destination,
        });
      },
    });
  });
}

/** Step 2: confirm the emailed code and set a new password. */
export function confirmForgotPassword(
  email: string,
  code: string,
  newPassword: string
): Promise<void> {
  if (!userPool && devAuth) return Promise.resolve();
  if (!userPool) return Promise.reject(new Error("Auth not configured."));

  return new Promise((resolve, reject) => {
    const user = new CognitoUser({ Username: email.trim().toLowerCase(), Pool: userPool });
    user.confirmPassword(code.trim(), newPassword, {
      onSuccess: () => resolve(),
      onFailure: (err) => reject(err),
    });
  });
}
