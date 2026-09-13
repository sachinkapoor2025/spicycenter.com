"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import {
  isDevAuthEnabled,
  isUnconfirmedError,
  formatAuthError,
} from "@/lib/cognito";
import { AccountDashboard } from "@/components/account/AccountDashboard";

type AuthMode = "login" | "register" | "confirm";

function AccountLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") ?? "/account";
  const { user, login, register, confirmSignUp, resendConfirmationCode, logout, isAdmin, loading: authLoading } =
    useAuth();

  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [confirmCode, setConfirmCode] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  const finishLogin = async () => {
    const authUser = await login(email, password);
    if (redirect.startsWith("/admin") && !authUser.isAdmin) {
      setError("You don't have permission to access that area.");
      logout();
      return;
    }
    router.push(redirect.startsWith("/account") ? redirect : "/account");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);

    try {
      if (mode === "confirm") {
        await confirmSignUp(email, confirmCode);
        setMessage("Email verified! Signing you in...");
        await finishLogin();
        return;
      }

      if (mode === "login") {
        await finishLogin();
        return;
      }

      const { userConfirmed } = await register(email, password, name);
      if (userConfirmed) {
        setMessage("Account created! Signing you in...");
        await finishLogin();
      } else {
        setMode("confirm");
        setConfirmCode("");
        setMessage(`We sent a verification code to ${email}. Enter it below to activate your account. Check your spam or junk folder if you don't see it within a few minutes.`);
      }
    } catch (err) {
      if (mode === "login" && isUnconfirmedError(err)) {
        setMode("confirm");
        setConfirmCode("");
        setMessage(formatAuthError(err));
        setError("");
      } else {
        setError(formatAuthError(err));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (!email) {
      setError("Enter your email address first.");
      return;
    }
    setError("");
    setMessage("");
    setResending(true);
    try {
      await resendConfirmationCode(email);
      setMessage(`A new verification code was sent to ${email}.`);
    } catch (err) {
      setError(formatAuthError(err));
    } finally {
      setResending(false);
    }
  };

  const switchMode = (next: AuthMode) => {
    setMode(next);
    setError("");
    setMessage("");
    if (next !== "confirm") setConfirmCode("");
  };

  if (authLoading) {
    return <div className="p-16 text-center text-slate-600">Loading account...</div>;
  }

  if (user) {
    return (
      <AccountDashboard
        user={user}
        token={user.token}
        isAdmin={isAdmin}
        onLogout={() => {
          logout();
          router.push("/");
        }}
      />
    );
  }

  const title =
    mode === "confirm" ? "Verify Your Email" : mode === "login" ? "Login" : "Create Account";

  return (
    <div className="max-w-md mx-auto px-4 py-16">
      <h1 className="text-3xl font-bold mb-2">{title}</h1>

      {isDevAuthEnabled() && (
        <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3 mb-6">
          Dev mode: use any email. Include <code>admin</code> in email for admin access (e.g.{" "}
          <strong>admin@shop.com</strong>).
        </p>
      )}

      {mode !== "confirm" && (
        <p className="text-slate-600 text-sm mb-6">
          Secure login with encrypted password protection. Your account details are kept private and safe.
        </p>
      )}

      {mode === "confirm" && (
        <p className="text-slate-600 text-sm mb-4">
          Enter the 6-digit code from your email to verify <strong>{email || "your account"}</strong>.
        </p>
      )}

      {mode === "confirm" && (
        <p className="text-amber-800 text-sm bg-amber-50 border border-amber-200 rounded-lg p-3 mb-6">
          Didn&apos;t receive the code? Check your <strong>spam or junk</strong> folder — verification emails
          sometimes land there. You can also tap &quot;Resend verification code&quot; below.
        </p>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {mode === "register" && (
          <input
            type="text"
            placeholder="Full name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full border border-slate-300 rounded-lg px-3 py-2"
          />
        )}

        {mode !== "confirm" && (
          <>
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2"
              required
              autoComplete="email"
            />
            <input
              type="password"
              placeholder="Password (min 8 chars)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2"
              minLength={8}
              required
              autoComplete={mode === "login" ? "current-password" : "new-password"}
            />
          </>
        )}

        {mode === "confirm" && (
          <>
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2"
              required
              autoComplete="email"
            />
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              placeholder="Verification code"
              value={confirmCode}
              onChange={(e) => setConfirmCode(e.target.value.replace(/\D/g, ""))}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-center text-lg tracking-widest"
              maxLength={6}
              required
              autoComplete="one-time-code"
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2"
              minLength={8}
              required
              autoComplete="current-password"
            />
          </>
        )}

        {error && <p className="text-red-500 text-sm">{error}</p>}
        {message && <p className="text-green-600 text-sm">{message}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-nav text-white py-3 rounded-lg font-semibold hover:bg-primary transition disabled:opacity-50"
        >
          {loading
            ? "Please wait..."
            : mode === "confirm"
              ? "Verify & sign in"
              : mode === "login"
                ? "Login"
                : "Register"}
        </button>
      </form>

      {mode === "confirm" && (
        <div className="mt-4 space-y-2">
          <button
            type="button"
            onClick={handleResendCode}
            disabled={resending || !email}
            className="text-sm text-nav underline hover:text-primary disabled:opacity-50"
          >
            {resending ? "Sending..." : "Resend verification code"}
          </button>
          <p className="text-sm text-slate-500">
            Wrong email?{" "}
            <button type="button" onClick={() => switchMode("register")} className="text-nav underline hover:text-primary">
              Register again
            </button>
          </p>
        </div>
      )}

      {mode === "login" && (
        <div className="mt-4 space-y-2">
          <button
            type="button"
            onClick={() => switchMode("register")}
            className="block text-sm text-nav underline hover:text-primary"
          >
            Need an account? Register
          </button>
          <button
            type="button"
            onClick={() => switchMode("confirm")}
            className="block text-sm text-slate-600 underline"
          >
            Have a verification code?
          </button>
        </div>
      )}

      {mode === "register" && (
        <button
          type="button"
          onClick={() => switchMode("login")}
          className="mt-4 text-sm text-nav underline hover:text-primary"
        >
          Already have an account? Login
        </button>
      )}
    </div>
  );
}

export default function AccountPage() {
  return (
    <Suspense fallback={<div className="p-16 text-center">Loading...</div>}>
      <AccountLoginForm />
    </Suspense>
  );
}
