"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import PageHeader from "@/components/features/PageHeader";
import Pagination from "@/components/features/Pagination";
import { useAuth } from "@/contexts/AuthContext";
import { getZaloGroups } from "@/lib/api/zalo-groups";
import type { PaginationMeta, ZaloGroup } from "@/lib/api/types";

const DEFAULT_LIMIT = 20;

const EMPTY_META: PaginationMeta = {
  page: 1,
  limit: DEFAULT_LIMIT,
  total: 0,
  totalPages: 1,
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}

export default function ZaloGroupsPage() {
  const { user, loading: authLoading } = useAuth();
  const [groups, setGroups] = useState<ZaloGroup[]>([]);
  const [meta, setMeta] = useState<PaginationMeta>(EMPTY_META);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadGroups = useCallback(async (nextPage: number) => {
    setLoading(true);
    setError("");

    try {
      const response = await getZaloGroups({
        page: nextPage,
        limit: DEFAULT_LIMIT,
      });

      setGroups(response.data);
      setMeta(response.meta);
      setPage((currentPage) => (currentPage === response.meta.page ? currentPage : response.meta.page));
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : "Không thể tải danh sách nhóm Zalo.",
      );
      setGroups([]);
      setMeta((currentMeta) => ({
        ...currentMeta,
        page: nextPage,
      }));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authLoading || !user) {
      return;
    }

    void loadGroups(page);
  }, [authLoading, loadGroups, page, user]);

  const pageSummary = useMemo(() => {
    if (meta.total === 0) {
      return "Chưa có dữ liệu";
    }

    const start = (meta.page - 1) * meta.limit + 1;
    const end = Math.min(meta.page * meta.limit, meta.total);

    return `Hiển thị ${start}-${end} / ${meta.total} nhóm`;
  }, [meta]);

  return (
    <div className="flex-1 overflow-y-auto p-8">
      <PageHeader
        title="Danh sách nhóm Zalo"
        description="Quản lý toàn bộ nhóm Zalo trong hệ thống"
      />

      <div className="overflow-hidden rounded-xl bg-surface-container-lowest shadow-sm shadow-slate-200/50">
        {error ? (
          <div className="border-b border-error/20 bg-error/10 px-6 py-4 text-sm text-error">{error}</div>
        ) : null}

        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="bg-surface-container-low/50">
              <th className="px-6 py-4 text-label-sm font-bold tracking-wider text-on-surface-variant">
                Tên nhóm
              </th>
              <th className="px-6 py-4 text-label-sm font-bold tracking-wider text-on-surface-variant">
                Zalo Group ID
              </th>
              <th className="px-6 py-4 text-label-sm font-bold tracking-wider text-on-surface-variant">
                Số tài khoản
              </th>
              <th className="px-6 py-4 text-label-sm font-bold tracking-wider text-on-surface-variant">
                Số tin nhắn
              </th>
              <th className="px-6 py-4 text-label-sm font-bold tracking-wider text-on-surface-variant">
                Ngày tạo
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-outline-variant/10">
            {loading ? (
              <tr>
                <td colSpan={5} className="px-6 py-10 text-center text-sm text-on-surface-variant">
                  Đang tải danh sách nhóm Zalo...
                </td>
              </tr>
            ) : groups.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-10 text-center text-sm text-on-surface-variant">
                  Chưa có nhóm Zalo nào.
                </td>
              </tr>
            ) : (
              groups.map((group) => (
                <tr key={group.id} className="group transition-colors hover:bg-surface-container-low/30">
                  <td className="px-6 py-4">
                    <div className="body-md font-semibold text-on-surface">{group.groupName}</div>
                  </td>

                  <td className="px-6 py-4">
                    <div className="body-md text-on-surface">{group.groupZaloId}</div>
                  </td>

                  <td className="px-6 py-4">
                    <span className="font-medium text-on-surface">{group._count.accountMaps}</span>
                  </td>

                  <td className="px-6 py-4">
                    <span className="font-medium text-on-surface">{group._count.messages}</span>
                  </td>

                  <td className="px-6 py-4">
                    <div className="text-sm text-on-surface-variant">{formatDate(group.createdAt)}</div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        <div className="flex flex-col gap-4 border-t border-outline-variant/10 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-on-surface-variant">{pageSummary}</div>

          <Pagination
            currentPage={meta.page}
            totalPages={meta.totalPages}
            onPageChange={setPage}
            disabled={loading}
          />
        </div>
      </div>
    </div>
  );
}
