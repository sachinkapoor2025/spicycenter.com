"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

export function AdminGuard({ children }: { children: React.ReactNode }) {
  const { user, loading, canAccessAdmin } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && (!user || !canAccessAdmin)) {
      router.replace("/account?redirect=/admin");
    }
  }, [user, loading, canAccessAdmin, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <p className="text-slate-500">Checking access...</p>
      </div>
    );
  }

  if (!user || !canAccessAdmin) return null;

  return <>{children}</>;
}
