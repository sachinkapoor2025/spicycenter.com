"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

/** Gate /ses-email — requires Cognito `email` group (or super-admin). */
export function EmailGuard({ children }: { children: React.ReactNode }) {
  const { user, loading, isEmailMarketer } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && (!user || !isEmailMarketer)) {
      router.replace("/account?redirect=/ses-email");
    }
  }, [user, loading, isEmailMarketer, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <p className="text-slate-500">Checking email access…</p>
      </div>
    );
  }

  if (!user || !isEmailMarketer) return null;

  return <>{children}</>;
}
