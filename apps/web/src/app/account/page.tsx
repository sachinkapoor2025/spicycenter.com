"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import {
  isDevAuthEnabled,
  isUnconfirmedError,
  isAlreadyConfirmedError,
  shouldRevealForgotFailure,
  formatAuthError,
  passwordMeetsPolicy,
  PASSWORD_POLICY_HINT,
} from "@/lib/cognito";
import { AccountDashboard } from "@/components/account/AccountDashboard";

type AuthMode = "login" | "register" | "confirm" | "forgot" | "reset";

const RESET_CODE_SENT =
  "If an account exists for that email, a reset code has been sent. Check your inbox and spam folder.";

function AccountLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") ?? "/account";
  const {
    user,
    login,
    register,
    confirmSignUp,
    resendConfirmationCode,
    forgotPassword,
    confirmForgotPassword,
    logout,
    isAdmin,
    loading: authLoading,
  } = useAuth();

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
        try {
          await confirmSignUp(email, confirmCode);
        } catch (err) {
          if (isAlreadyConfirmedError(err)) {
            setConfirmCode("");
            setMode("login");
            setError(formatAuthError(err));
            return;
          }
          throw err;
        }
        setMessage("Email verified! Signing you in...");
        await finishLogin();
        return;
      }

      if (mode === "login") {
        await finishLogin();
        return;
      }

      if (mode === "forgot") {
        try {
          await forgotPassword(email);
        } catch (err) {
          if (shouldRevealForgotFailure(err)) throw err;
        }
        setConfirmCode("");
        setPassword("");
        setMode("reset");
        setMessage(RESET_CODE_SENT);
        return;
      }

      if (mode === "reset") {
        if (!passwordMeetsPolicy(password)) {
          setError(PASSWORD_POLICY_HINT);
          return;
        }
        await confirmForgotPassword(email, confirmCode, password);
        setConfirmCode("");
        setPassword("");
        setMode("login");
        setMessage("Password updated. You can log in with your new password.");
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
      } else if (mode === "confirm" && isAlreadyConfirmedError(err)) {
        setConfirmCode("");
        setMode("login");
        setError(formatAuthError(err));
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
      if (mode === "reset") {
        try {
          await forgotPassword(email);
        } catch (err) {
          if (shouldRevealForgotFailure(err)) throw err;
        }
        setMessage(RESET_CODE_SENT);
      } else {
        await resendConfirmationCode(email);
        setMessage(`A new verification code was sent to ${email}.`);
      }
    } catch (err) {
      if (mode === "confirm" && isAlreadyConfirmedError(err)) {
        setConfirmCode("");
        setMode("login");
        setError(formatAuthError(err));
      } else {
        setError(formatAuthError(err));
      }
    } finally {
      setResending(false);
    }
  };

  const switchMode = (next: AuthMode) => {
    setMode(next);
    setError("");
    setMessage("");
    if (next !== "confirm" && next !== "reset") setConfirmCode("");
    if (next === "forgot" || next === "reset") setPassword("");
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
    mode === "confirm"
      ? "Verify Your Email"
      : mode === "login"
        ? "Login"
        : mode === "forgot"
          ? "Reset Password"
          : mode === "reset"
            ? "Set New Password"
            : "Create Account";

  const submitLabel =
    mode === "confirm"
      ? "Verify & sign in"
      : mode === "login"
        ? "Login"
        : mode === "forgot"
          ? "Send reset code"
          : mode === "reset"
            ? "Update password"
            : "Register";

  return (
    <div className="max-w-md mx-auto px-4 py-16">
      <h1 className="text-3xl font-bold mb-2">{title}</h1>

      {isDevAuthEnabled() && (
        <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3 mb-6">
          Dev mode: use any email. Include <code>admin</code> in email for admin access (e.g.{" "}
          <strong>admin@shop.com</strong>).
        </p>
      )}

      {(mode === "login" || mode === "register") && (
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

      {mode === "forgot" && (
        <p className="text-slate-600 text-sm mb-6">
          Enter your email and we will send a reset code if an account exists. This does not confirm whether
          the email is registered.
        </p>
      )}

      {mode === "reset" && (
        <p className="text-slate-600 text-sm mb-6">
          Enter the reset code from your email and choose a new password. {PASSWORD_POLICY_HINT}
        </p>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {mode === "register" && (
          <input
            type="text"
            placeholder="Full name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-base"
          />
        )}

        {(mode === "login" || mode === "register") && (
          <>
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-base"
              required
              autoComplete="email"
            />
            <input
              type="password"
              placeholder="Password (min 8 chars)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-base"
              minLength={8}
              required
              autoComplete={mode === "login" ? "current-password" : "new-password"}
            />
          </>
        )}

        {mode === "forgot" && (
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-base"
            required
            autoComplete="email"
          />
        )}

        {mode === "confirm" && (
          <>
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-base"
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
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-base"
              minLength={8}
              required
              autoComplete="current-password"
            />
          </>
        )}

        {mode === "reset" && (
          <>
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-base"
              required
              autoComplete="email"
            />
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              placeholder="Reset code"
              value={confirmCode}
              onChange={(e) => setConfirmCode(e.target.value.replace(/\D/g, ""))}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-center text-lg tracking-widest"
              maxLength={6}
              required
              autoComplete="one-time-code"
            />
            <input
              type="password"
              placeholder="New password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-base"
              minLength={8}
              required
              autoComplete="new-password"
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
          {loading ? "Please wait..." : submitLabel}
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
            Already verified?{" "}
            <button type="button" onClick={() => switchMode("login")} className="text-nav underline hover:text-primary">
              Log in
            </button>
            {" · "}
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
            onClick={() => switchMode("forgot")}
            className="block text-sm text-nav underline hover:text-primary"
          >
            Forgot password?
          </button>
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
            Have a signup verification code?
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

      {(mode === "forgot" || mode === "reset") && (
        <div className="mt-4 space-y-2">
          {mode === "reset" && (
            <button
              type="button"
              onClick={handleResendCode}
              disabled={resending || !email}
              className="block text-sm text-nav underline hover:text-primary disabled:opacity-50"
            >
              {resending ? "Sending..." : "Resend reset code"}
            </button>
          )}
          <button
            type="button"
            onClick={() => switchMode("login")}
            className="block text-sm text-nav underline hover:text-primary"
          >
            Back to login
          </button>
        </div>
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
