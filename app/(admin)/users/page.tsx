"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { HiNoSymbol, HiShieldCheck, HiTrash, HiUserPlus } from "react-icons/hi2";
import ActionMenu, { type ActionItem } from "@/components/features/ActionMenu";
import Modal from "@/components/features/Modal";
import PageHeader from "@/components/features/PageHeader";
import Pagination from "@/components/features/Pagination";
import { useToast } from "@/components/features/Toast";
import Button from "@/components/ui/Button";
import FormError from "@/components/ui/FormError";
import Badge from "@/components/ui/Badge";
import {
  DataTableScroll,
  dataTableClassName,
  dataTableFrozenFirstColumnInnerClass,
} from "@/components/ui/DataTableScroll";
import { useAuth } from "@/contexts/AuthContext";
import { createUser, deleteUser, getUsers, updateUser } from "@/lib/api/users";
import type { AdminUser, PaginationMeta, UserRole } from "@/lib/api/types";

const DEFAULT_LIMIT = 20;

const EMPTY_META: PaginationMeta = {
  page: 1,
  limit: DEFAULT_LIMIT,
  total: 0,
  totalPages: 1,
};

const FROZEN_EMAIL_COL =
  "min-w-0 max-w-[min(42vw,11rem)] sm:max-w-44 md:max-w-52 lg:max-w-56";

const ROLE_OPTIONS: { value: UserRole; label: string }[] = [
  { value: "ADMIN", label: "Quản trị" },
  { value: "USER", label: "Người dùng" },
];

function roleLabel(role: UserRole) {
  return ROLE_OPTIONS.find((o) => o.value === role)?.label ?? role;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export default function UsersPage() {
  const { user: authUser, loading: authLoading } = useAuth();
  const { showToast } = useToast();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [meta, setMeta] = useState<PaginationMeta>(EMPTY_META);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [addOpen, setAddOpen] = useState(false);
  const [addEmail, setAddEmail] = useState("");
  const [addPassword, setAddPassword] = useState("");
  const [addRole, setAddRole] = useState<UserRole>("USER");
  const [addTouched, setAddTouched] = useState(false);
  const [addSubmitting, setAddSubmitting] = useState(false);
  const [addError, setAddError] = useState("");

  const [roleTarget, setRoleTarget] = useState<AdminUser | null>(null);
  const [roleDraft, setRoleDraft] = useState<UserRole>("USER");
  const [roleSubmitting, setRoleSubmitting] = useState(false);
  const [roleError, setRoleError] = useState("");

  const loadUsers = useCallback(async (nextPage: number) => {
    setLoading(true);
    setError("");

    try {
      const response = await getUsers({
        page: nextPage,
        limit: DEFAULT_LIMIT,
      });

      setUsers(response.data);
      setMeta(response.meta);
      setPage((currentPage) =>
        currentPage === response.meta.page ? currentPage : response.meta.page,
      );
    } catch (e) {
      setError(getErrorMessage(e, "Không thể tải danh sách người dùng."));
      setUsers([]);
      setMeta((currentMeta) => ({
        ...currentMeta,
        page: nextPage,
      }));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authLoading || !authUser) {
      return;
    }

    void loadUsers(page);
  }, [authLoading, authUser, loadUsers, page]);

  const pageSummary = useMemo(() => {
    if (meta.total === 0) {
      return "Chưa có dữ liệu";
    }
    const start = (meta.page - 1) * meta.limit + 1;
    const end = Math.min(meta.page * meta.limit, meta.total);
    return `Hiển thị ${start}-${end} / ${meta.total} tài khoản`;
  }, [meta]);

  const openAddModal = useCallback(() => {
    setAddEmail("");
    setAddPassword("");
    setAddRole("USER");
    setAddTouched(false);
    setAddError("");
    setAddOpen(true);
  }, []);

  const closeAddModal = useCallback(() => {
    setAddOpen(false);
  }, []);

  const addEmailTrim = addEmail.trim();

  const handleCreate = useCallback(async () => {
    setAddTouched(true);
    if (addEmailTrim.length === 0 || addPassword.length < 6) {
      return;
    }

    setAddSubmitting(true);
    setAddError("");

    try {
      await createUser({
        email: addEmailTrim,
        password: addPassword,
        role: addRole,
      });
      showToast("Đã tạo tài khoản.", "success");
      setAddOpen(false);
      if (page === 1) {
        await loadUsers(1);
      } else {
        setPage(1);
      }
    } catch (e) {
      setAddError(getErrorMessage(e, "Không thể tạo tài khoản."));
    } finally {
      setAddSubmitting(false);
    }
  }, [addEmailTrim, addPassword, addRole, loadUsers, page, showToast]);

  const openRoleModal = useCallback((row: AdminUser) => {
    setRoleTarget(row);
    setRoleDraft(row.role);
    setRoleError("");
    setRoleSubmitting(false);
  }, []);

  const closeRoleModal = useCallback(() => {
    setRoleTarget(null);
  }, []);

  const handleSaveRole = useCallback(async () => {
    if (!roleTarget) {
      return;
    }
    setRoleSubmitting(true);
    setRoleError("");
    try {
      await updateUser(roleTarget.id, { role: roleDraft });
      showToast("Đã cập nhật quyền.", "success");
      setRoleTarget(null);
      await loadUsers(page);
    } catch (e) {
      setRoleError(getErrorMessage(e, "Không thể cập nhật quyền."));
    } finally {
      setRoleSubmitting(false);
    }
  }, [roleDraft, roleTarget, loadUsers, page, showToast]);

  const handleBlock = useCallback(
    async (row: AdminUser) => {
      try {
        await updateUser(row.id, { isActive: false });
        showToast("Đã khóa tài khoản.", "success");
        await loadUsers(page);
      } catch (e) {
        showToast(getErrorMessage(e, "Không thể khóa tài khoản."), "error");
      }
    },
    [loadUsers, page, showToast],
  );

  const handleDelete = useCallback(
    async (row: AdminUser) => {
      const confirmed = window.confirm("Bạn có chắc chắn muốn xóa?");
      if (!confirmed) {
        return;
      }
      try {
        await deleteUser(row.id);
        showToast("Đã xóa tài khoản.", "success");
        await loadUsers(page);
      } catch (e) {
        showToast(getErrorMessage(e, "Không thể xóa tài khoản."), "error");
      }
    },
    [loadUsers, page, showToast],
  );

  const getActionItems = useCallback(
    (row: AdminUser): ActionItem[] => {
      const isSelf = row.id === authUser?.id;
      const items: ActionItem[] = [];

      if (!isSelf) {
        items.push({
          label: "Đổi quyền",
          icon: <HiShieldCheck className="h-4 w-4" />,
          onClick: () => openRoleModal(row),
        });
        if (row.isActive) {
          items.push({
            label: "Block tài khoản",
            icon: <HiNoSymbol className="h-4 w-4" />,
            onClick: () => void handleBlock(row),
          });
        }
        items.push({
          label: "Xóa",
          icon: <HiTrash className="h-4 w-4" />,
          danger: true,
          onClick: () => void handleDelete(row),
        });
      }

      return items;
    },
    [authUser?.id, handleBlock, handleDelete, openRoleModal],
  );

  const selectClassName =
    "w-full rounded-lg border border-transparent bg-surface-container-low px-4 py-2.5 text-body-md transition-all focus:border-primary focus:ring-2 focus:ring-primary-fixed";

  return (
    <div className="min-w-0 flex-1 overflow-y-auto p-8">
      <PageHeader
        title="Quản lý người dùng"
        description="Danh sách tài khoản hệ thống (chỉ ADMIN)"
        actions={
          <Button
            size="sm"
            startIcon={<HiUserPlus className="h-4 w-4" />}
            onClick={openAddModal}
            type="button"
          >
            Thêm tài khoản
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
                <th
                  className={`text-left text-sm text-label-sm font-normal tracking-wider text-on-surface px-6 py-3 ${FROZEN_EMAIL_COL}`}
                >
                  Email
                </th>
                <th className="text-sm px-6 py-3 text-left text-label-sm font-normal tracking-wider text-on-surface">
                  Quyền
                </th>
                <th className="whitespace-nowrap text-sm px-6 py-3 text-left text-label-sm font-normal tracking-wider text-on-surface">
                  Trạng thái
                </th>
                <th className="whitespace-nowrap text-sm px-6 py-3 text-left text-label-sm font-normal tracking-wider text-on-surface">
                  Ngày tạo
                </th>
                <th className="w-0 whitespace-nowrap px-6 py-3 text-right text-label-sm font-normal tracking-wider text-on-surface" />
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/10">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-sm text-on-surface-variant">
                    Đang tải danh sách…
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-sm text-on-surface-variant">
                    Chưa có tài khoản nào.
                  </td>
                </tr>
              ) : (
                users.map((row) => {
                  const actions = getActionItems(row);
                  return (
                    <tr key={row.id} className="group transition-colors hover:bg-surface-container-low/30">
                      <td className={`px-6 py-3 ${FROZEN_EMAIL_COL}`}>
                        <div
                          className={`body-md text-sm font-semibold text-on-surface ${dataTableFrozenFirstColumnInnerClass}`}
                        >
                          {row.email}
                        </div>
                      </td>
                      <td className="px-6 py-3">
                        <Badge variant={row.role === "ADMIN" ? "success" : "default"} className="text-xs">
                          {roleLabel(row.role)}
                        </Badge>
                      </td>
                      <td className="px-6 py-3">
                        {row.isActive ? (
                          <Badge variant="success" className="text-xs">
                            Đang hoạt động
                          </Badge>
                        ) : (
                          <Badge variant="default" className="text-xs">
                            Đã khóa
                          </Badge>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-6 py-3 text-sm text-on-surface-variant">
                        {formatDate(row.createdAt)}
                      </td>
                      <td className="px-6 py-3 text-right align-middle">
                        {actions.length > 0 ? (
                          <div className="inline-flex">
                            <ActionMenu items={actions} />
                          </div>
                        ) : (
                          <span className="text-sm text-on-surface-variant">—</span>
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

      <Modal
        open={addOpen}
        title="Thêm tài khoản"
        onClose={closeAddModal}
        onSubmit={() => void handleCreate()}
        loading={addSubmitting}
        loadingText="Đang tạo…"
        buttonText="Tạo tài khoản"
        cancelText="Hủy"
      >
        <div>
          <label className="mb-1.5 block text-sm font-medium text-on-surface" htmlFor="user-email">
            Email
          </label>
          <input
            id="user-email"
            autoFocus
            type="email"
            autoComplete="off"
            className="w-full rounded-lg border border-transparent bg-surface-container-low px-4 py-2.5 text-body-md transition-all placeholder:text-outline focus:border-primary focus:ring-2 focus:ring-primary-fixed"
            placeholder="user@example.com"
            value={addEmail}
            onChange={(e) => {
              setAddEmail(e.target.value);
              if (addError) {
                setAddError("");
              }
            }}
            onBlur={() => setAddTouched(true)}
            disabled={addSubmitting}
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-on-surface" htmlFor="user-password">
            Mật khẩu
          </label>
          <input
            id="user-password"
            type="password"
            autoComplete="new-password"
            className="w-full rounded-lg border border-transparent bg-surface-container-low px-4 py-2.5 text-body-md transition-all placeholder:text-outline focus:border-primary focus:ring-2 focus:ring-primary-fixed"
            placeholder="Tối thiểu 6 ký tự"
            value={addPassword}
            onChange={(e) => {
              setAddPassword(e.target.value);
              if (addError) {
                setAddError("");
              }
            }}
            onBlur={() => setAddTouched(true)}
            disabled={addSubmitting}
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-on-surface" htmlFor="user-role">
            Quyền
          </label>
          <select
            id="user-role"
            className={selectClassName}
            value={addRole}
            onChange={(e) => setAddRole(e.target.value as UserRole)}
            disabled={addSubmitting}
          >
            {ROLE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        {addTouched && addEmailTrim.length === 0 ? (
          <FormError message="Nhập email hợp lệ." />
        ) : null}
        {addTouched && addPassword.length > 0 && addPassword.length < 6 ? (
          <FormError message="Mật khẩu tối thiểu 6 ký tự." />
        ) : null}
        {addError ? <p className="text-sm text-error">{addError}</p> : null}
      </Modal>

      <Modal
        open={roleTarget !== null}
        title="Đổi quyền"
        onClose={closeRoleModal}
        onSubmit={() => void handleSaveRole()}
        loading={roleSubmitting}
        loadingText="Đang lưu…"
        buttonText="Lưu"
        cancelText="Hủy"
      >
        {roleTarget ? (
          <div>
            <p className="text-sm text-on-surface-variant">
              Tài khoản: <span className="font-medium text-on-surface">{roleTarget.email}</span>
            </p>
            <label className="mb-1.5 mt-2 block text-sm font-medium text-on-surface" htmlFor="edit-user-role">
              Quyền mới
            </label>
            <select
              id="edit-user-role"
              className={selectClassName}
              value={roleDraft}
              onChange={(e) => setRoleDraft(e.target.value as UserRole)}
              disabled={roleSubmitting}
            >
              {ROLE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            {roleError ? <p className="text-sm text-error">{roleError}</p> : null}
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
