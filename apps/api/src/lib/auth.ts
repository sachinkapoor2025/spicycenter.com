import type { APIGatewayProxyEventV2 } from "aws-lambda";
import type { StaffActor } from "@spicycorner/shared";
import { findVendorByEmail } from "./markets-store";

export interface AuthContext {
  userId: string;
  email: string;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  /** Cognito `email` group — SES bulk campaign module access. */
  isEmailMarketer: boolean;
  /** Cognito `vendor` group — vendor portal (data still scoped by email mapping). */
  isVendor: boolean;
}

const DEV_AUTH_ENABLED =
  process.env.DEV_AUTH_ENABLED === "true" || process.env.ENVIRONMENT === "local";

/** Decode JWT payload or dev token for local testing. */
export function getAuth(event: APIGatewayProxyEventV2): AuthContext | null {
  const authHeader = event.headers?.authorization ?? event.headers?.Authorization;
  if (!authHeader?.startsWith("Bearer ")) return null;

  const token = authHeader.slice(7);

  if (token.startsWith("dev:") && DEV_AUTH_ENABLED) {
    const [, email, role] = token.split(":");
    if (!email) return null;
    const isSuperAdmin = role === "super-admin";
    const isVendor = role === "vendor";
    const isEmailMarketer =
      role === "email" || isSuperAdmin || email.toLowerCase().includes("email");
    return {
      userId: `dev-${email}`,
      email,
      isSuperAdmin,
      isAdmin: role === "admin" || isSuperAdmin,
      isEmailMarketer,
      isVendor,
    };
  }

  try {
    const payload = JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString());
    const groups: string[] = payload["cognito:groups"] ?? [];
    const isSuperAdmin = groups.includes("super-admin");
    const isEmailMarketer = groups.includes("email") || isSuperAdmin;
    return {
      userId: payload.sub as string,
      email: (payload.email as string) ?? "",
      isSuperAdmin,
      isAdmin: groups.includes("admin") || isSuperAdmin,
      isEmailMarketer,
      isVendor: groups.includes("vendor"),
    };
  } catch {
    return null;
  }
}

export function getSessionId(event: APIGatewayProxyEventV2): string | undefined {
  return event.headers?.["x-session-id"] ?? event.headers?.["X-Session-Id"];
}

export function getUserOrSessionKey(event: APIGatewayProxyEventV2): string | null {
  const auth = getAuth(event);
  if (auth) return auth.userId;
  const sessionId = getSessionId(event);
  return sessionId ?? null;
}

export function requireAdmin(event: APIGatewayProxyEventV2): AuthContext | null {
  const auth = getAuth(event);
  if (!auth?.isAdmin) return null;
  return auth;
}

export function requireSuperAdmin(event: APIGatewayProxyEventV2): AuthContext | null {
  const auth = getAuth(event);
  if (!auth?.isSuperAdmin) return null;
  return auth;
}

/** Cognito `email` group (or super-admin) for /ses-email module. */
export function requireEmailAccess(event: APIGatewayProxyEventV2): AuthContext | null {
  const auth = getAuth(event);
  if (!auth?.isEmailMarketer) return null;
  return auth;
}

export function requireAdminOrVendor(event: APIGatewayProxyEventV2): AuthContext | null {
  const auth = getAuth(event);
  if (!auth) return null;
  if (auth.isAdmin || auth.isVendor) return auth;
  return null;
}

/**
 * Resolve staff actor with server-side vendor slug.
 * Vendor identity comes from the vendor record email map — never from request params.
 */
export async function resolveStaffActor(event: APIGatewayProxyEventV2): Promise<StaffActor | null> {
  const auth = getAuth(event);
  if (!auth) return null;
  if (auth.isAdmin) {
    return {
      email: auth.email,
      isAdmin: true,
      isSuperAdmin: auth.isSuperAdmin,
      isVendor: false,
    };
  }
  if (!auth.isVendor) return null;
  const vendor = await findVendorByEmail(auth.email);
  if (!vendor?.slug) return null;
  return {
    email: auth.email,
    isAdmin: false,
    isSuperAdmin: false,
    isVendor: true,
    vendorSlug: vendor.slug,
  };
}
