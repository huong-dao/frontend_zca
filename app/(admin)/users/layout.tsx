"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

export default function UsersLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading || !user) {
      return;
    }
    if (user.role !== "ADMIN") {
      router.replace("/dashboard");
    }
  }, [loading, router, user]);

  if (loading || !user) {
    return null;
  }

  if (user.role !== "ADMIN") {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center p-8 text-sm text-on-surface-variant">
        Bạn không có quyền truy cập trang này.
      </div>
    );
  }

  return <>{children}</>;
}
