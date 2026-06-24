"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  HiArrowDownTray,
  HiArrowPath,
  HiEye,
  HiOutlineFunnel,
  HiOutlineTrash,
} from "react-icons/hi2";
import ActionMenu, { type ActionItem } from "@/components/features/ActionMenu";
import PageHeader from "@/components/features/PageHeader";
import Pagination from "@/components/features/Pagination";
import { useToast } from "@/components/features/Toast";
import { useAuth } from "@/contexts/AuthContext";
import {
  deleteMedia,
  deleteMediaBatch,
  downloadMediaFile,
  getMedia,
  openMediaFileInNewTab,
} from "@/lib/api/media";
import type { MediaItem, MessageLogStatus, PaginationMeta } from "@/lib/api/types";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import { DataTableScroll, dataTableClassName } from "@/components/ui/DataTableScroll";

const DEFAULT_LIMIT = 20;

const EMPTY_META: PaginationMeta = {
  page: 1,
  limit: DEFAULT_LIMIT,
  total: 0,
  totalPages: 1,
};

type MediaListFilters = {
  fileName: string;
  sentFrom: string;
  sentTo: string;
};

const EMPTY_LIST_FILTERS: MediaListFilters = {
  fileName: "",
  sentFrom: "",
  sentTo: "",
};

const FILTER_INPUT_CLASS =
  "w-full rounded-xl border-none bg-surface-container-low py-2 pl-4 pr-4 text-sm transition-all placeholder:text-on-surface-variant focus:bg-white focus:ring-2 focus:ring-primary/20";

function trimFilters(filters: MediaListFilters): MediaListFilters {
  return {
    fileName: filters.fileName.trim(),
    sentFrom: filters.sentFrom.trim(),
    sentTo: filters.sentTo.trim(),
  };
}

function toIsoDateTime(localValue: string) {
  if (!localValue) {
    return undefined;
  }
  const date = new Date(localValue);
  if (Number.isNaN(date.getTime())) {
    return undefined;
  }
  return date.toISOString();
}

function hasListFilters(filters: MediaListFilters) {
  const trimmed = trimFilters(filters);
  return Boolean(trimmed.fileName || trimmed.sentFrom || trimmed.sentTo);
}

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

function formatFileSize(bytes: number) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
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

export default function MediaPage() {
  const { user, loading: authLoading } = useAuth();
  const { showToast } = useToast();
  const [items, setItems] = useState<MediaItem[]>([]);
  const [meta, setMeta] = useState<PaginationMeta>(EMPTY_META);
  const [page, setPage] = useState(1);
  const [draftFilters, setDraftFilters] = useState<MediaListFilters>(EMPTY_LIST_FILTERS);
  const [activeFilters, setActiveFilters] = useState<MediaListFilters>(EMPTY_LIST_FILTERS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [batchDeleting, setBatchDeleting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());

  const loadMedia = useCallback(
    async (nextPage: number, options?: { silent?: boolean }) => {
      const silent = options?.silent ?? false;
      if (silent) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError("");

      try {
        const trimmed = trimFilters(activeFilters);
        const sentFrom = toIsoDateTime(trimmed.sentFrom);
        const sentTo = toIsoDateTime(trimmed.sentTo);
        const response = await getMedia({
          page: nextPage,
          limit: DEFAULT_LIMIT,
          ...(trimmed.fileName ? { fileName: trimmed.fileName } : {}),
          ...(sentFrom ? { sentFrom } : {}),
          ...(sentTo ? { sentTo } : {}),
        });
        setItems(response.data);
        setMeta(response.meta);
        if (response.meta.page !== nextPage) {
          setPage(response.meta.page);
        }
      } catch (requestError) {
        setError(
          requestError instanceof Error ? requestError.message : "Không thể tải danh sách file.",
        );
        if (!silent) {
          setItems([]);
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
    [activeFilters],
  );

  useEffect(() => {
    if (authLoading || !user) {
      return;
    }
    void loadMedia(page);
  }, [authLoading, loadMedia, page, user]);

  useEffect(() => {
    setSelectedIds(new Set());
  }, [page, activeFilters]);

  const handleApplyFilters = () => {
    const trimmed = trimFilters(draftFilters);
    setDraftFilters(trimmed);
    setActiveFilters(trimmed);
    setPage(1);
  };

  const handleResetFilters = () => {
    setDraftFilters(EMPTY_LIST_FILTERS);
    setActiveFilters(EMPTY_LIST_FILTERS);
    setPage(1);
  };

  const updateDraftFilter = (key: keyof MediaListFilters, value: string) => {
    setDraftFilters((current) => ({ ...current, [key]: value }));
  };

  const hasActiveFilters = hasListFilters(activeFilters);

  const handleRefresh = () => {
    void loadMedia(page, { silent: true });
  };

  const handleDownload = async (row: MediaItem) => {
    try {
      await downloadMediaFile(row.id, row.fileName);
    } catch (requestError) {
      showToast(getErrorMessage(requestError, "Không thể tải file."), "error");
    }
  };

  const handlePreview = async (row: MediaItem) => {
    try {
      await openMediaFileInNewTab(row.id);
    } catch (requestError) {
      showToast(getErrorMessage(requestError, "Không thể mở file."), "error");
    }
  };

  const handleDelete = useCallback(
    async (row: MediaItem) => {
      const confirmed = window.confirm(
        `Bạn có chắc chắn muốn xóa file "${row.fileName}"? Hành động này không thể hoàn tác.`,
      );
      if (!confirmed) {
        return;
      }

      setDeletingId(row.id);
      try {
        await deleteMedia(row.id);
        setSelectedIds((previous) => {
          const next = new Set(previous);
          next.delete(row.id);
          return next;
        });
        showToast(`Đã xóa file "${row.fileName}".`, "success");
        await loadMedia(page, { silent: true });
      } catch (requestError) {
        showToast(getErrorMessage(requestError, "Không thể xóa file."), "error");
      } finally {
        setDeletingId(null);
      }
    },
    [loadMedia, page, showToast],
  );

  const handleBatchDelete = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) {
      return;
    }

    const confirmed = window.confirm(
      `Bạn có chắc chắn muốn xóa ${ids.length} file đã chọn? Hành động này không thể hoàn tác.`,
    );
    if (!confirmed) {
      return;
    }

    setBatchDeleting(true);
    try {
      const response = await deleteMediaBatch(ids);
      setSelectedIds(new Set());
      showToast(`Đã xóa ${response.deletedCount} file.`, "success");
      await loadMedia(page, { silent: true });
    } catch (requestError) {
      showToast(getErrorMessage(requestError, "Không thể xóa các file đã chọn."), "error");
    } finally {
      setBatchDeleting(false);
    }
  };

  const toggleRowSelection = (id: string, checked: boolean) => {
    setSelectedIds((previous) => {
      const next = new Set(previous);
      if (checked) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  };

  const pageIds = useMemo(() => items.map((item) => item.id), [items]);
  const allPageSelected = pageIds.length > 0 && pageIds.every((id) => selectedIds.has(id));

  const toggleSelectAllOnPage = (checked: boolean) => {
    setSelectedIds((previous) => {
      const next = new Set(previous);
      for (const id of pageIds) {
        if (checked) {
          next.add(id);
        } else {
          next.delete(id);
        }
      }
      return next;
    });
  };

  const getMediaActionItems = useCallback(
    (row: MediaItem): ActionItem[] => [
      {
        label: "Xem",
        icon: <HiEye className="h-4 w-4" />,
        onClick: () => void handlePreview(row),
      },
      {
        label: "Tải",
        icon: <HiArrowDownTray className="h-4 w-4" />,
        onClick: () => void handleDownload(row),
      },
      {
        label: deletingId === row.id ? "Đang xóa…" : "Xóa",
        icon: <HiOutlineTrash className="h-4 w-4" />,
        danger: true,
        onClick: () => void handleDelete(row),
      },
    ],
    [deletingId, handleDelete],
  );

  const pageSummary = useMemo(() => {
    if (meta.total === 0) {
      return "Chưa có dữ liệu";
    }
    const start = (meta.page - 1) * meta.limit + 1;
    const end = Math.min(meta.page * meta.limit, meta.total);
    return `Hiển thị ${start}-${end} / ${meta.total} file`;
  }, [meta]);

  const selectedCount = selectedIds.size;

  return (
    <div className="min-w-0 flex-1 overflow-y-auto p-8">
      <PageHeader
        title="Media"
        description="Danh sách file đính kèm đã lưu từ các lần gửi tin nhắn"
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

        <div className="space-y-4 bg-surface-container-lowest px-6 py-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-on-surface-variant">Tên file</label>
              <input
                className={FILTER_INPUT_CLASS}
                placeholder="Tìm theo tên file"
                type="text"
                value={draftFilters.fileName}
                onChange={(event) => updateDraftFilter("fileName", event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    handleApplyFilters();
                  }
                }}
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-on-surface-variant">Gửi từ</label>
              <input
                className={FILTER_INPUT_CLASS}
                type="datetime-local"
                value={draftFilters.sentFrom}
                onChange={(event) => updateDraftFilter("sentFrom", event.target.value)}
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-on-surface-variant">Gửi đến</label>
              <input
                className={FILTER_INPUT_CLASS}
                type="datetime-local"
                value={draftFilters.sentTo}
                onChange={(event) => updateDraftFilter("sentTo", event.target.value)}
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              className="h-9"
              startIcon={<HiOutlineFunnel className="h-5 w-5" />}
              onClick={handleApplyFilters}
              disabled={loading}
            >
              Lọc
            </Button>
            <Button
              className="h-9"
              variant="outline"
              onClick={handleResetFilters}
              disabled={loading || !hasActiveFilters}
            >
              Đặt lại
            </Button>
          </div>
        </div>

        {selectedCount > 0 ? (
          <div className="flex flex-wrap items-center gap-3 border-b border-outline-variant/10 bg-surface-container-low/40 px-6 py-3">
            <span className="text-sm text-on-surface">
              Đã chọn <strong>{selectedCount}</strong> file
            </span>
            <Button
              type="button"
              size="sm"
              variant="destructive"
              startIcon={<HiOutlineTrash className="h-4 w-4" />}
              disabled={batchDeleting || loading}
              loading={batchDeleting}
              onClick={() => void handleBatchDelete()}
            >
              Xóa
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={batchDeleting}
              onClick={() => setSelectedIds(new Set())}
            >
              Bỏ chọn
            </Button>
          </div>
        ) : null}

        <DataTableScroll>
          <table className={dataTableClassName}>
            <thead>
              <tr className="bg-surface-container-low/50">
                <th className="w-10 px-4 py-3 text-left">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-outline-variant/40 text-primary focus:ring-primary/30"
                    aria-label="Chọn tất cả file trên trang này"
                    checked={allPageSelected}
                    disabled={loading || items.length === 0}
                    onChange={(event) => toggleSelectAllOnPage(event.target.checked)}
                  />
                </th>
                <th className="text-sm px-6 py-3 text-label-sm tracking-wider text-on-surface font-normal">
                  Tên file
                </th>
                <th className="text-sm px-6 py-3 text-label-sm tracking-wider text-on-surface font-normal">
                  Loại file
                </th>
                <th className="text-sm px-6 py-3 text-label-sm tracking-wider text-on-surface font-normal">
                  Kích thước
                </th>
                <th className="text-sm px-6 py-3 text-label-sm tracking-wider text-on-surface font-normal">
                  Gửi lúc
                </th>
                <th className="text-sm px-6 py-3 text-label-sm tracking-wider text-on-surface font-normal">
                  Trạng thái tin
                </th>
                <th className="text-sm px-6 py-3 text-right text-label-sm text-on-surface font-normal" />
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/10">
              {loading && items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-10 text-center text-sm text-on-surface-variant">
                    Đang tải danh sách file…
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-10 text-center text-sm text-on-surface-variant">
                    {hasActiveFilters ? "Không có file nào phù hợp bộ lọc." : "Chưa có file nào."}
                  </td>
                </tr>
              ) : (
                items.map((row) => {
                  const actionItems = getMediaActionItems(row);
                  const isSelected = selectedIds.has(row.id);
                  return (
                    <tr key={row.id} className="group transition-colors hover:bg-surface-container-low/30">
                      <td className="px-4 py-3 align-top">
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-outline-variant/40 text-primary focus:ring-primary/30"
                          aria-label={`Chọn ${row.fileName}`}
                          checked={isSelected}
                          disabled={loading || batchDeleting}
                          onChange={(event) => toggleRowSelection(row.id, event.target.checked)}
                        />
                      </td>
                      <td className="px-6 py-3 align-top text-sm text-on-surface">
                        <div className="max-w-md truncate font-medium" title={row.fileName}>
                          {row.fileName}
                        </div>
                      </td>
                      <td className="px-6 py-3 align-top text-sm text-on-surface-variant">
                        {row.mimeType ?? "—"}
                      </td>
                      <td className="px-6 py-3 align-top text-sm text-on-surface">
                        {formatFileSize(row.sizeBytes)}
                      </td>
                      <td className="px-6 py-3 align-top text-sm text-on-surface-variant">
                        {formatDateTime(row.sentAt)}
                      </td>
                      <td className="px-6 py-3 align-top">
                        <Badge variant={statusBadgeVariant(row.message.status)} className="text-xs">
                          {row.message.status}
                        </Badge>
                      </td>
                      <td className="px-6 py-3 text-right align-top">
                        <div className="inline-flex">
                          <ActionMenu items={actionItems} />
                        </div>
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
