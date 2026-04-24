"use client";

import { useCallback, useEffect, useState } from "react";
import { HiKey, HiTrash } from "react-icons/hi2";
import ActionMenu, { type ActionItem } from "@/components/features/ActionMenu";
import Modal from "@/components/features/Modal";
import PageHeader from "@/components/features/PageHeader";
import { useToast } from "@/components/features/Toast";
import Button from "@/components/ui/Button";
import FormError from "@/components/ui/FormError";
import Badge from "@/components/ui/Badge";
import { DataTableScroll, dataTableClassName } from "@/components/ui/DataTableScroll";
import { useAuth } from "@/contexts/AuthContext";
import { createApiKey, deleteApiKey, getApiKeys } from "@/lib/api/api-keys";
import type { ApiKey } from "@/lib/api/types";

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export default function ApiKeysPage() {
  const { user, loading: authLoading } = useAuth();
  const { showToast } = useToast();
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [addModalOpen, setAddModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [nameTouched, setNameTouched] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const nameTrim = name.trim();
  const nameInvalid = nameTouched && nameTrim.length === 0;

  const loadKeys = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const list = await getApiKeys();
      setKeys(Array.isArray(list) ? list : []);
    } catch (e) {
      setError(getErrorMessage(e, "Không thể tải danh sách API key."));
      setKeys([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authLoading || !user) {
      return;
    }
    void loadKeys();
  }, [authLoading, loadKeys, user]);

  const openAddModal = useCallback(() => {
    setName("");
    setNameTouched(false);
    setSubmitError("");
    setAddModalOpen(true);
  }, []);

  const closeAddModal = useCallback(() => {
    setAddModalOpen(false);
  }, []);

  const handleCreate = useCallback(async () => {
    setNameTouched(true);
    if (nameTrim.length === 0) {
      return;
    }

    setSubmitting(true);
    setSubmitError("");

    try {
      await createApiKey({ name: nameTrim });
      showToast("Đã tạo API key mới. Lưu lại secret key ở nơi an toàn.", "success");
      setAddModalOpen(false);
      setName("");
      setNameTouched(false);
      await loadKeys();
    } catch (e) {
      setSubmitError(getErrorMessage(e, "Không thể tạo API key."));
    } finally {
      setSubmitting(false);
    }
  }, [nameTrim, loadKeys, showToast]);

  const handleDeleteApiKey = useCallback(
    async (row: ApiKey) => {
      const confirmed = window.confirm("Bạn có chắc chắn muốn xóa?");
      if (!confirmed) {
        return;
      }

      try {
        await deleteApiKey(row.id);
        showToast("Đã xóa API key.", "success");
        await loadKeys();
      } catch (e) {
        showToast(getErrorMessage(e, "Không thể xóa API key."), "error");
      }
    },
    [loadKeys, showToast],
  );

  const getActionItems = useCallback(
    (row: ApiKey): ActionItem[] => [
      {
        label: "Xóa",
        icon: <HiTrash className="h-4 w-4" />,
        danger: true,
        onClick: () => void handleDeleteApiKey(row),
      },
    ],
    [handleDeleteApiKey],
  );

  return (
    <div className="min-w-0 flex-1 overflow-y-auto p-8">
      <PageHeader
        title="API Keys"
        description="Quản lý public API key dùng cho tích hợp bên ngoài"
        actions={
          <Button size="sm" startIcon={<HiKey className="h-4 w-4" />} onClick={openAddModal} type="button">
            Thêm API key
          </Button>
        }
      />

      <div className="overflow-hidden rounded-xl bg-surface-container-lowest shadow-sm shadow-slate-200/50">
        {error ? (
          <div className="border-b border-error/20 bg-error/10 px-6 py-4 text-sm text-error">{error}</div>
        ) : null}

        <DataTableScroll freezeFirstColumn={true}>
          <table className={dataTableClassName}>
            <thead>
              <tr className="bg-surface-container-low/50">
                <th className="text-sm px-6 py-3 text-left text-label-sm font-normal tracking-wider text-on-surface">
                  Tên
                </th>
                <th className="text-sm px-6 py-3 text-left text-label-sm font-normal tracking-wider text-on-surface min-w-48">
                  Secret key
                </th>
                <th className="whitespace-nowrap text-sm px-6 py-3 text-left text-label-sm font-normal tracking-wider text-on-surface">
                  Trạng thái
                </th>
                <th className="whitespace-nowrap text-sm px-6 py-3 text-left text-label-sm font-normal tracking-wider text-on-surface">
                  Tạo lúc
                </th>
                <th className="w-0 whitespace-nowrap px-6 py-3 text-right text-label-sm font-normal tracking-wider text-on-surface" />
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/10">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-sm text-on-surface-variant">
                    Đang tải API keys…
                  </td>
                </tr>
              ) : keys.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-sm text-on-surface-variant">
                    Chưa có API key nào. Bấm &quot;Thêm API key&quot; để tạo mới.
                  </td>
                </tr>
              ) : (
                keys.map((row) => (
                  <tr
                    key={row.id}
                    className="group transition-colors hover:bg-surface-container-low/30"
                  >
                    <td className="px-6 py-3">
                      <div className="body-md text-sm font-semibold text-on-surface">{row.name}</div>
                    </td>
                    <td className="max-w-md px-6 py-3">
                      <code className="block break-all text-xs text-on-surface md:text-sm">
                        {row.secretKey}
                      </code>
                    </td>
                    <td className="px-6 py-3">
                      {row.isActive ? (
                        <Badge variant="success" className="text-xs">
                          Đang hoạt động
                        </Badge>
                      ) : (
                        <Badge variant="default" className="text-xs">
                          Tắt
                        </Badge>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-6 py-3 text-sm text-on-surface-variant">
                      {formatDateTime(row.createdAt)}
                    </td>
                    <td className="px-6 py-3 text-right align-middle">
                      <div className="inline-flex">
                        <ActionMenu items={getActionItems(row)} />
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </DataTableScroll>

        <div className="border-t border-outline-variant/10 px-6 py-4">
          <div className="text-sm text-on-surface-variant">
            {keys.length === 0 && !loading ? "Tổng: 0 API key" : `Tổng: ${keys.length} API key`}
          </div>
        </div>
      </div>

      <Modal
        open={addModalOpen}
        title="Thêm API key"
        onClose={closeAddModal}
        onSubmit={() => void handleCreate()}
        loading={submitting}
        loadingText="Đang tạo…"
        buttonText="Tạo API key"
        cancelText="Hủy"
      >
        <div>
          <label className="mb-1.5 block text-sm font-medium text-on-surface" htmlFor="api-key-name">
            Tên API
          </label>
          <input
            id="api-key-name"
            autoFocus
            className="w-full rounded-lg border border-transparent bg-surface-container-low px-4 py-2.5 text-body-md transition-all placeholder:text-outline focus:border-primary focus:ring-2 focus:ring-primary-fixed"
            placeholder="Ví dụ: Tích hợp CRM nội bộ"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (submitError) {
                setSubmitError("");
              }
            }}
            onBlur={() => setNameTouched(true)}
            disabled={submitting}
            maxLength={200}
          />
          {nameInvalid ? <FormError message="Nhập tên API (ít nhất 1 ký tự)." /> : null}
        </div>
        {submitError ? <p className="text-sm text-error">{submitError}</p> : null}
      </Modal>
    </div>
  );
}
