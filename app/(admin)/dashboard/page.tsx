"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import {
  HiArrowPath,
  HiChatBubbleLeftRight,
  HiCheckCircle,
  HiMiniUserGroup,
  HiMiniUsers,
  HiXCircle,
} from "react-icons/hi2";
import PageHeader from "@/components/features/PageHeader";
import Button from "@/components/ui/Button";
import { useAuth } from "@/contexts/AuthContext";
import { getMessages } from "@/lib/api/messages";
import { getZaloAccounts } from "@/lib/api/zalo-accounts";
import { getZaloGroups } from "@/lib/api/zalo-groups";

type DashboardStats = {
  groupCount: number;
  accountCount: number;
  sentCount: number;
  failedCount: number;
};

const EMPTY_STATS: DashboardStats = {
  groupCount: 0,
  accountCount: 0,
  sentCount: 0,
  failedCount: 0,
};

function formatCount(value: number) {
  return new Intl.NumberFormat("vi-VN").format(value);
}

function StatCard({
  title,
  value,
  description,
  href,
  icon,
  accentClass,
  loading,
}: {
  title: string;
  value: number;
  description: string;
  href: string;
  icon: ReactNode;
  accentClass: string;
  loading: boolean;
}) {
  return (
    <Link
      href={href}
      className="group block rounded-xl bg-surface-container-lowest p-6 shadow-sm shadow-slate-200/50 transition-colors hover:bg-surface-container-low/40"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm text-on-surface-variant">{title}</p>
          <p className="mt-2 text-3xl font-bold tracking-tight text-on-surface">
            {loading ? "—" : formatCount(value)}
          </p>
          <p className="mt-2 text-xs text-on-surface-variant">{description}</p>
        </div>
        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${accentClass}`}
          aria-hidden
        >
          {icon}
        </div>
      </div>
    </Link>
  );
}

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const [stats, setStats] = useState<DashboardStats>(EMPTY_STATS);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const loadStats = useCallback(async (options?: { silent?: boolean }) => {
    const silent = options?.silent ?? false;
    if (silent) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError("");

    try {
      const [groups, accounts, sent, failed] = await Promise.all([
        getZaloGroups({ page: 1, limit: 1 }),
        getZaloAccounts(),
        getMessages({ page: 1, limit: 1, status: "SENT" }),
        getMessages({ page: 1, limit: 1, status: "FAILED" }),
      ]);

      setStats({
        groupCount: groups.meta.total,
        accountCount: accounts.length,
        sentCount: sent.meta.total,
        failedCount: failed.meta.total,
      });
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Không thể tải thống kê dashboard.",
      );
      if (!silent) {
        setStats(EMPTY_STATS);
      }
    } finally {
      if (silent) {
        setRefreshing(false);
      } else {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    if (authLoading || !user) {
      return;
    }
    void loadStats();
  }, [authLoading, loadStats, user]);

  const isBusy = loading || refreshing;

  return (
    <div className="min-w-0 flex-1 overflow-y-auto p-8">
      <PageHeader
        title="Dashboard"
        description="Xem tổng quan về hệ thống"
        actions={
          <Button
            variant="outline"
            size="sm"
            startIcon={<HiArrowPath className={refreshing ? "animate-spin" : undefined} />}
            loading={refreshing}
            disabled={isBusy}
            onClick={() => void loadStats({ silent: true })}
          >
            Làm mới
          </Button>
        }
      />

      {error ? (
        <div className="mb-6 rounded-xl border border-error/20 bg-error/10 px-4 py-3 text-sm text-error">
          {error}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Nhóm Zalo"
          value={stats.groupCount}
          description="Tổng số nhóm trong hệ thống"
          href="/zalo-groups"
          icon={<HiMiniUserGroup className="h-5 w-5" />}
          accentClass="bg-primary/10 text-primary"
          loading={loading}
        />
        <StatCard
          title="Tài khoản Zalo"
          value={stats.accountCount}
          description="Tổng số tài khoản đã liên kết"
          href="/zalo-accounts"
          icon={<HiMiniUsers className="h-5 w-5" />}
          accentClass="bg-blue-500/10 text-blue-600"
          loading={loading}
        />
        <StatCard
          title="Tin nhắn thành công"
          value={stats.sentCount}
          description="Trạng thái SENT"
          href="/messages"
          icon={<HiCheckCircle className="h-5 w-5" />}
          accentClass="bg-emerald-500/10 text-emerald-600"
          loading={loading}
        />
        <StatCard
          title="Tin nhắn thất bại"
          value={stats.failedCount}
          description="Trạng thái FAILED"
          href="/messages"
          icon={<HiXCircle className="h-5 w-5" />}
          accentClass="bg-error/10 text-error"
          loading={loading}
        />
      </div>

      <div className="mt-6 rounded-xl bg-surface-container-lowest p-6 shadow-sm shadow-slate-200/50">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface-container-low text-on-surface-variant">
            <HiChatBubbleLeftRight className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-on-surface">Tổng quan tin nhắn</h3>
            <p className="mt-1 text-sm text-on-surface-variant">
              {loading
                ? "Đang tải dữ liệu tin nhắn..."
                : `Đã gửi thành công ${formatCount(stats.sentCount)} tin, thất bại ${formatCount(stats.failedCount)} tin.`}
            </p>
            <Link
              href="/messages"
              className="mt-3 inline-flex text-sm font-medium text-primary hover:underline"
            >
              Xem lịch sử tin nhắn
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
