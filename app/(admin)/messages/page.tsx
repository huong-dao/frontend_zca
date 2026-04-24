"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { HiArrowPath, HiArrowUturnLeft } from "react-icons/hi2";
import ActionMenu, { type ActionItem } from "@/components/features/ActionMenu";
import PageHeader from "@/components/features/PageHeader";
import Pagination from "@/components/features/Pagination";
import { useToast } from "@/components/features/Toast";
import { useAuth } from "@/contexts/AuthContext";
import { getMessages, undoMessage } from "@/lib/api/messages";
import type { MessageLog, MessageLogStatus, PaginationMeta } from "@/lib/api/types";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import {
  DataTableScroll,
  dataTableClassName,
  dataTableFrozenFirstColumnInnerClass,
} from "@/components/ui/DataTableScroll";

const DEFAULT_LIMIT = 20;

/** Cùng class cho cột 1 (Nội dung) — `th` + `td`; chỉnh `max-w-*` tại đây. */
const FROZEN_CONTENT_COL =
  "min-w-0 max-w-[min(42vw,11rem)] sm:max-w-44 md:max-w-52 lg:max-w-md";

const EMPTY_META: PaginationMeta = {
  page: 1,
  limit: DEFAULT_LIMIT,
  total: 0,
  totalPages: 1,
};

const STATUS_FILTERS: { value: "" | MessageLogStatus; label: string }[] = [
  { value: "", label: "Tất cả" },
  { value: "SENT", label: "Đã gửi" },
  { value: "FAILED", label: "Thất bại" },
  { value: "RECALL", label: "Thu hồi" },
];

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(value));
}

function statusBadgeVariant(status: MessageLogStatus): "success" | "error" | "info" | "warning" {
  if (status === "SENT") {
    return "success";
  }
  if (status === "FAILED") {
    return "error";
  }
  return "info";
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export default function MessagesPage() {
  const { user, loading: authLoading } = useAuth();
  const { showToast } = useToast();
  const [messages, setMessages] = useState<MessageLog[]>([]);
  const [meta, setMeta] = useState<PaginationMeta>(EMPTY_META);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<"" | MessageLogStatus>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [recallingId, setRecallingId] = useState<string | null>(null);

  const loadMessages = useCallback(
    async (nextPage: number, options?: { silent?: boolean }) => {
      const silent = options?.silent ?? false;
      if (silent) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError("");

      try {
        const response = await getMessages({
          page: nextPage,
          limit: DEFAULT_LIMIT,
          ...(statusFilter ? { status: statusFilter } : {}),
        });
        setMessages(response.data);
        setMeta(response.meta);
        if (response.meta.page !== nextPage) {
          setPage(response.meta.page);
        }
      } catch (requestError) {
        setError(
          requestError instanceof Error ? requestError.message : "Không thể tải danh sách tin nhắn.",
        );
        if (!silent) {
          setMessages([]);
        }
        setMeta((current) => ({
          ...current,
          page: nextPage,
        }));
      } finally {
        if (silent) {
          setRefreshing(false);
        } else {
          setLoading(false);
        }
      }
    },
    [statusFilter],
  );

  useEffect(() => {
    if (authLoading || !user) {
      return;
    }
    void loadMessages(page);
  }, [authLoading, loadMessages, page, user]);

  const handleStatusChange = (next: "" | MessageLogStatus) => {
    setStatusFilter(next);
    setPage(1);
  };

  const handleRefresh = () => {
    void loadMessages(page, { silent: true });
  };

  const handleRecallMessage = useCallback(
    async (row: MessageLog) => {
      if (row.status !== "SENT") {
        return;
      }
      setRecallingId(row.id);
      try {
        const { message: updated } = await undoMessage(row.id);
        setMessages((previous) => previous.map((item) => (item.id === row.id ? updated : item)));
        showToast("Đã thu hồi tin nhắn.", "success");
      } catch (requestError) {
        showToast(
          getErrorMessage(requestError, "Không thể thu hồi tin nhắn."),
          "error",
        );
      } finally {
        setRecallingId(null);
      }
    },
    [showToast],
  );

  const getMessageActionItems = (row: MessageLog): ActionItem[] => {
    if (row.status !== "SENT") {
      return [];
    }
    return [
      {
        label: recallingId === row.id ? "Đang thu hồi…" : "Thu hồi",
        icon: <HiArrowUturnLeft />,
        danger: true,
        onClick: () => void handleRecallMessage(row),
      },
    ];
  };

  const pageSummary = useMemo(() => {
    if (meta.total === 0) {
      return "Chưa có dữ liệu";
    }
    const start = (meta.page - 1) * meta.limit + 1;
    const end = Math.min(meta.page * meta.limit, meta.total);
    return `Hiển thị ${start}-${end} / ${meta.total} tin`;
  }, [meta]);

  return (
    <div className="min-w-0 flex-1 overflow-y-auto p-8">
      <PageHeader
        title="Tin nhắn"
        description="Nhật ký tin nhắn đã gửi qua hệ thống (theo tài khoản người gửi và nhóm)"
        actions={
          <Button
            type="button"
            variant="outline"
            startIcon={<HiArrowPath className="h-4 w-4" />}
            onClick={handleRefresh}
            disabled={loading || refreshing}
            loading={refreshing}
          >
            Làm mới
          </Button>
        }
      />

      <div className="overflow-hidden rounded-xl bg-surface-container-lowest shadow-sm shadow-slate-200/50">
        {error ? (
          <div className="border-b border-error/20 bg-error/10 px-6 py-4 text-sm text-error">{error}</div>
        ) : null}

        <div className="bg-surface-container-lowest pl-6 pr-6 py-4 rounded-xl">
          <div className="flex flex-wrap items-center gap-2">
            {STATUS_FILTERS.map((item) => (
              <Button
                key={item.value || "all"}
                size="sm"
                variant={statusFilter === item.value ? "primary" : "outline"}
                onClick={() => handleStatusChange(item.value)}
                disabled={loading}
              >
                {item.label}
              </Button>
            ))}
          </div>
        </div>

        <DataTableScroll freezeFirstColumn={true}>
        <table className={dataTableClassName}>
          <thead>
            <tr className="bg-surface-container-low/50">
              <th
                className={`whitespace-nowrap text-sm px-6 py-3 text-label-sm font-normal tracking-wider text-on-surface ${FROZEN_CONTENT_COL}`}
              >
                Nội dung
              </th>
              <th className="text-sm px-6 py-3 text-label-sm tracking-wider text-on-surface font-normal">
                Nhóm/Người dùng
              </th>
              <th className="text-sm px-6 py-3 text-label-sm tracking-wider text-on-surface font-normal">
                Người gửi
              </th>
              <th className="text-sm px-6 py-3 text-label-sm tracking-wider text-on-surface font-normal">
                Số điện thoại
              </th>
              <th className="text-sm px-6 py-3 text-label-sm tracking-wider text-on-surface font-normal">
                Trạng thái
              </th>
              <th className="text-sm px-6 py-3 text-label-sm tracking-wider text-on-surface font-normal">
                Gửi lúc
              </th>
              <th className="text-sm px-6 py-3 text-label-sm text-right text-on-surface font-normal" />
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant/10">
            {loading && messages.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-10 text-center text-sm text-on-surface-variant">
                  Đang tải danh sách tin nhắn…
                </td>
              </tr>
            ) : messages.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-10 text-center text-sm text-on-surface-variant">
                  {statusFilter
                    ? "Không có tin nhắn nào phù hợp bộ lọc."
                    : "Chưa có tin nhắn nào."}
                </td>
              </tr>
            ) : (
              messages.map((row) => {
                const actionItems = getMessageActionItems(row);
                return (
                  <tr key={row.id} className="group transition-colors hover:bg-surface-container-low/30">
                    <td className={`px-6 py-3 align-top ${FROZEN_CONTENT_COL}`}>
                      <p
                        className={`${dataTableFrozenFirstColumnInnerClass} whitespace-pre-wrap text-sm text-on-surface`}
                        title={row.content}
                      >
                        {row.content}
                      </p>
                    </td>
                    <td className="px-6 py-3 align-top text-sm text-on-surface">
                      <div className="font-medium">
                        {row.group?.groupName?.trim()
                          ? row.group.groupName
                          : row.peerPhone || "—"}
                      </div>
                    </td>
                    <td className="px-6 py-3 align-top text-sm text-on-surface">
                      <div className="font-medium flex flex-wrap items-center gap-1.5">
                        <span>{row.sender?.name ?? "—"}</span>
                        {row.sender?.isDeleted ? (
                          <Badge variant="error" className="text-[10px]">
                            Đã xóa
                          </Badge>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-6 py-3 align-top text-sm text-on-surface">
                      {row.sender?.phone ?? "—"}
                    </td>
                    <td className="px-6 py-3 align-top">
                      <Badge variant={statusBadgeVariant(row.status)} className="text-xs">
                        {row.status}
                      </Badge>
                    </td>
                    <td className="px-6 py-3 align-top text-sm text-on-surface-variant">
                      {row.sentAt ? formatDateTime(row.sentAt) : "—"}
                    </td>
                    <td className="px-6 py-3 text-right align-top">
                      {actionItems.length > 0 ? (
                        <div className="inline-flex">
                          <ActionMenu items={actionItems} />
                        </div>
                      ) : (
                        <span className="text-xs text-on-surface-variant">—</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
        </DataTableScroll>

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
