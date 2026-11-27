"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { AuthUser, ForgotPasswordDelivery, RegisterResult } from "./cognito";
import { loadStoredAuth } from "./auth-session";

function loadCognito() {
  return import("./cognito");
}

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<AuthUser>;
  completeNewPassword: (newPassword: string) => Promise<AuthUser>;
  register: (email: string, password: string, name?: string) => Promise<RegisterResult>;
  confirmSignUp: (email: string, code: string) => Promise<void>;
  resendConfirmationCode: (email: string) => Promise<void>;
  forgotPassword: (email: string) => Promise<ForgotPasswordDelivery>;
  confirmForgotPassword: (email: string, code: string, newPassword: string) => Promise<void>;
  logout: () => void;
  token: string | undefined;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  isEmailMarketer: boolean;
  isVendor: boolean;
  vendorSlug?: string;
  canAccessAdmin: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setUser(loadStoredAuth());
    setLoading(false);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const { login: cognitoLogin } = await loadCognito();
    const authUser = await cognitoLogin(email, password);
    setUser(authUser);
    return authUser;
  }, []);

  const completeNewPassword = useCallback(async (newPassword: string) => {
    const { completeNewPassword: cognitoCompleteNewPassword } = await loadCognito();
    const authUser = await cognitoCompleteNewPassword(newPassword);
    setUser(authUser);
    return authUser;
  }, []);

  const register = useCallback(async (email: string, password: string, name?: string) => {
    const { register: cognitoRegister } = await loadCognito();
    return cognitoRegister(email, password, name);
  }, []);

  const confirmSignUp = useCallback(async (email: string, code: string) => {
    const { confirmSignUp: cognitoConfirmSignUp } = await loadCognito();
    await cognitoConfirmSignUp(email, code);
  }, []);

  const resendConfirmationCode = useCallback(async (email: string) => {
    const { resendConfirmationCode: cognitoResendCode } = await loadCognito();
    await cognitoResendCode(email);
  }, []);

  const forgotPassword = useCallback(async (email: string) => {
    const { forgotPassword: cognitoForgotPassword } = await loadCognito();
    return cognitoForgotPassword(email);
  }, []);

  const confirmForgotPassword = useCallback(
    async (email: string, code: string, newPassword: string) => {
      const { confirmForgotPassword: cognitoConfirmForgotPassword } = await loadCognito();
      await cognitoConfirmForgotPassword(email, code, newPassword);
    },
    []
  );

  const logout = useCallback(() => {
    void loadCognito().then(({ logout: cognitoLogout }) => {
      cognitoLogout();
      setUser(null);
    });
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        completeNewPassword,
        register,
        confirmSignUp,
        resendConfirmationCode,
        forgotPassword,
        confirmForgotPassword,
        logout,
        token: user?.token,
        isAdmin: user?.isAdmin ?? false,
        isSuperAdmin: user?.isSuperAdmin ?? false,
        isEmailMarketer: user?.isEmailMarketer ?? false,
        isVendor: user?.isVendor ?? false,
        vendorSlug: user?.vendorSlug,
        canAccessAdmin: Boolean(user?.isAdmin || user?.isVendor),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

/** Client-side API helper with auth + session */
export function useApiClient() {
  const { token } = useAuth();
  const sessionId =
    typeof window !== "undefined" ? localStorage.getItem("hr_ecom_session") ?? undefined : undefined;

  return useCallback(
    async <T,>(path: string, options: RequestInit = {}): Promise<T> => {
      const { api } = await import("./api");
      return api<T>(path, { ...options, token, sessionId });
    },
    [token, sessionId]
  );
}
