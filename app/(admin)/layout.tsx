"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/layout/Header";
import Sidebar from "@/components/layout/Sidebar";
import { useAuth } from "@/contexts/AuthContext";
import { AdminNavProvider } from "@/contexts/AdminNavContext";
import { ZaloGroupNameSyncProvider } from "@/contexts/ZaloGroupNameSyncContext";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [loading, router, user]);

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface text-on-surface-variant">
        Đang tải phiên đăng nhập...
      </div>
    );
  }

  return (
    <ZaloGroupNameSyncProvider>
      <AdminNavProvider>
        <Sidebar />
        <main className="min-h-screen w-full lg:ml-64">
          <Header />
          {children}
        </main>
      </AdminNavProvider>
    </ZaloGroupNameSyncProvider>
  );
}