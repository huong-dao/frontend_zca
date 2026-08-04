"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { HiOutlineFunnel, HiOutlineInformationCircle, HiOutlinePencilSquare, HiOutlineUserGroup } from "react-icons/hi2";
import PageHeader from "@/components/features/PageHeader";
import Pagination from "@/components/features/Pagination";
import Modal from "@/components/features/Modal";
import ActionMenu, { type ActionItem } from "@/components/features/ActionMenu";
import { useToast } from "@/components/features/Toast";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import FormError from "@/components/ui/FormError";
import { useAuth } from "@/contexts/AuthContext";
import { useZaloGroupNameSync } from "@/contexts/ZaloGroupNameSyncContext";
import { getGroupMetadataSyncStatus } from "@/lib/api/background-jobs";
import { filterZaloAccountsByType } from "@/lib/api/zalo-accounts";
import {
  changeZaloGroupName,
  getLinkedAccountsByGroupId,
  getZaloGroupInfo,
  getZaloGroups,
} from "@/lib/api/zalo-groups";
import { getCurrentZaloSession } from "@/lib/zalo/client";
import { ensureZaloSessionValid } from "@/lib/zalo/session-verify";
import type {
  GroupMetadataSyncStatus,
  PaginationMeta,
  ZaloGroup,
  ZaloGroupInfoResponse,
  ZaloGroupLinkedAccount,
} from "@/lib/api/types";
import {
  DataTableScroll,
  dataTableClassName,
  dataTableFrozenFirstColumnInnerClass,
} from "@/components/ui/DataTableScroll";

const DEFAULT_LIMIT = 20;

/** Cùng class cho `th` cột 1 + `td` cột 1: chỉnh `max-w-*` / `w-*` ở đây (mobile: hẹp, desktop: rộng hơn). */
const FROZEN_GROUP_NAME_COL =
  "min-w-0 max-w-[min(42vw,11rem)] sm:max-w-44 md:max-w-52 lg:max-w-56";

const EMPTY_META: PaginationMeta = {
  page: 1,
  limit: DEFAULT_LIMIT,
  total: 0,
  totalPages: 1,
};

const GROUP_METADATA_SYNC_POLL_MS = 3 * 60 * 1000;

function formatDate(value: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

const GROUP_INFO_FIELD_LABELS: Record<string, string> = {
  name: "Tên nhóm",
  globalId: "Global ID",
  groupName: "Tên nhóm",
  group_name: "Tên nhóm",
  gridName: "Tên nhóm",
  title: "Tiêu đề",
  subject: "Chủ đề",
  groupId: "Grid ID",
  group_zalo_id: "Grid ID",
  memberCount: "Số thành viên",
  totalMember: "Số thành viên",
  desc: "Mô tả",
  description: "Mô tả",
  avatar: "Avatar",
  fullAvatar: "Avatar đầy đủ",
  creatorId: "Người tạo",
  adminIds: "Danh sách admin",
};

function formatGroupInfoValue(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return "—";
  }

  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function buildGroupInfoRows(group: ZaloGroup, payload: ZaloGroupInfoResponse | null) {
  const rows: { key: string; label: string; value: string }[] = [
    {
      key: "group_zalo_id",
      label: GROUP_INFO_FIELD_LABELS.group_zalo_id,
      value: group.groupZaloId,
    },
  ];

  if (!payload?.groupInfo) {
    return rows;
  }

  const gridEntry = payload.groupInfo.gridInfoMap?.[group.groupZaloId];

  if (gridEntry) {
    for (const [fieldKey, fieldValue] of Object.entries(gridEntry)) {
      rows.push({
        key: fieldKey,
        label: GROUP_INFO_FIELD_LABELS[fieldKey] ?? fieldKey,
        value: formatGroupInfoValue(fieldValue),
      });
    }
  }

  for (const [fieldKey, fieldValue] of Object.entries(payload.groupInfo)) {
    if (fieldKey === "gridInfoMap") {
      continue;
    }

    rows.push({
      key: `groupInfo.${fieldKey}`,
      label: GROUP_INFO_FIELD_LABELS[fieldKey] ?? fieldKey,
      value: formatGroupInfoValue(fieldValue),
    });
  }

  return rows;
}

export default function ZaloGroupsPage() {
  const { user, loading: authLoading } = useAuth();
  const { showToast } = useToast();
  const { currentBatchSize, isSyncing, lastCompletedAt, lastError, pendingCount } = useZaloGroupNameSync();
  const [groups, setGroups] = useState<ZaloGroup[]>([]);
  const [meta, setMeta] = useState<PaginationMeta>(EMPTY_META);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [keywordSearch, setKeywordSearch] = useState("");
  const [activeKeyword, setActiveKeyword] = useState("");
  const [serverGroupMetadataSync, setServerGroupMetadataSync] =
    useState<GroupMetadataSyncStatus | null>(null);
  const prevServerMetadataSyncRunningRef = useRef(false);
  const [openLinkedAccountsModal, setOpenLinkedAccountsModal] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<ZaloGroup | null>(null);
  const [linkedAccounts, setLinkedAccounts] = useState<ZaloGroupLinkedAccount[]>([]);
  const [linkedAccountsLoading, setLinkedAccountsLoading] = useState(false);
  const [linkedAccountsError, setLinkedAccountsError] = useState("");
  const [openGroupInfoModal, setOpenGroupInfoModal] = useState(false);
  const [groupInfoTarget, setGroupInfoTarget] = useState<ZaloGroup | null>(null);
  const [groupInfoPayload, setGroupInfoPayload] = useState<ZaloGroupInfoResponse | null>(null);
  const [groupInfoLoading, setGroupInfoLoading] = useState(false);
  const [groupInfoError, setGroupInfoError] = useState("");
  const [openRenameModal, setOpenRenameModal] = useState(false);
  const [renameGroup, setRenameGroup] = useState<ZaloGroup | null>(null);
  const [newGroupName, setNewGroupName] = useState("");
  const [renameError, setRenameError] = useState("");
  const [renameSubmitting, setRenameSubmitting] = useState(false);

  const loadGroups = useCallback(async (nextPage: number) => {
    setLoading(true);
    setError("");

    try {
      const trimmed = activeKeyword.trim();
      const response = await getZaloGroups({
        page: nextPage,
        limit: DEFAULT_LIMIT,
        ...(trimmed ? { keyword: trimmed } : {}),
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
  }, [activeKeyword]);

  useEffect(() => {
    if (authLoading || !user) {
      return;
    }

    void loadGroups(page);
  }, [authLoading, loadGroups, page, user]);

  useEffect(() => {
    if (!lastCompletedAt || authLoading || !user) {
      return;
    }

    void loadGroups(page);
  }, [authLoading, lastCompletedAt, loadGroups, page, user]);

  useEffect(() => {
    if (authLoading || !user?.id) {
      return;
    }

    let cancelled = false;

    const refreshServerSyncStatus = async () => {
      try {
        const status = await getGroupMetadataSyncStatus();
        if (cancelled) {
          return;
        }

        const running = status.groupSyncEnabled && status.status === "RUNNING";

        if (prevServerMetadataSyncRunningRef.current && !running) {
          void loadGroups(page);
        }

        prevServerMetadataSyncRunningRef.current = running;
        setServerGroupMetadataSync(status);
      } catch {
        if (!cancelled) {
          setServerGroupMetadataSync(null);
        }
      }
    };

    void refreshServerSyncStatus();
    const intervalId = window.setInterval(refreshServerSyncStatus, GROUP_METADATA_SYNC_POLL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [authLoading, loadGroups, page, user?.id]);

  const handleSearch = useCallback(() => {
    setPage(1);
    setActiveKeyword(keywordSearch.trim());
  }, [keywordSearch]);

  const handleCloseLinkedAccountsModal = useCallback(() => {
    setOpenLinkedAccountsModal(false);
    setSelectedGroup(null);
    setLinkedAccounts([]);
    setLinkedAccountsError("");
  }, []);

  const handleCloseGroupInfoModal = useCallback(() => {
    setOpenGroupInfoModal(false);
    setGroupInfoTarget(null);
    setGroupInfoPayload(null);
    setGroupInfoError("");
  }, []);

  const handleOpenGroupInfoModal = useCallback(async (group: ZaloGroup) => {
    setGroupInfoTarget(group);
    setOpenGroupInfoModal(true);
    setGroupInfoPayload(null);
    setGroupInfoError("");
    setGroupInfoLoading(true);

    try {
      const sessionResponse = await getCurrentZaloSession();
      const sessionList =
        sessionResponse.sessions.length > 0
          ? sessionResponse.sessions
          : sessionResponse.session
            ? [sessionResponse.session]
            : [];

      const activeSessionId = sessionResponse.activeSessionId ?? sessionResponse.session?.id ?? null;
      const activeSession =
        (activeSessionId ? sessionList.find((session) => session.id === activeSessionId) : null) ??
        sessionResponse.session ??
        sessionList[0] ??
        null;

      if (!activeSession) {
        setGroupInfoError(
          "Chưa có phiên Zalo đang chọn. Vui lòng đăng nhập Zalo (QR) và chọn phiên ở header.",
        );
        return;
      }

      const sessionValidity = await ensureZaloSessionValid(activeSession.id, {
        label: activeSession.user.displayName || activeSession.user.zaloName || activeSession.user.uid,
      });

      if (!sessionValidity.ok) {
        setGroupInfoError(sessionValidity.reason);
        return;
      }

      const response = await getZaloGroupInfo({
        sessionId: activeSession.id,
        groupId: group.groupZaloId,
      });

      setGroupInfoPayload(response);
    } catch (requestError) {
      setGroupInfoError(
        requestError instanceof Error
          ? requestError.message
          : "Không thể lấy thông tin nhóm từ Zalo.",
      );
    } finally {
      setGroupInfoLoading(false);
    }
  }, []);

  const handleOpenLinkedAccountsModal = useCallback(async (group: ZaloGroup) => {
    setSelectedGroup(group);
    setOpenLinkedAccountsModal(true);
    setLinkedAccounts([]);
    setLinkedAccountsError("");
    setLinkedAccountsLoading(true);

    try {
      const response = await getLinkedAccountsByGroupId(group.id);
      setLinkedAccounts(response.data);
    } catch (requestError) {
      setLinkedAccountsError(
        requestError instanceof Error
          ? requestError.message
          : "Không thể tải danh sách tài khoản liên kết.",
      );
    } finally {
      setLinkedAccountsLoading(false);
    }
  }, []);

  const handleCloseRenameModal = useCallback(() => {
    setOpenRenameModal(false);
    setRenameGroup(null);
    setNewGroupName("");
    setRenameError("");
    setRenameSubmitting(false);
  }, []);

  const handleOpenRenameModal = useCallback((group: ZaloGroup) => {
    setRenameGroup(group);
    setNewGroupName(group.groupName);
    setRenameError("");
    setOpenRenameModal(true);
  }, []);

  const handleSubmitRenameGroup = useCallback(async () => {
    if (!renameGroup) {
      return;
    }

    const trimmedName = newGroupName.trim();

    if (!trimmedName) {
      setRenameError("Tên nhóm không được để trống.");
      return;
    }

    if (trimmedName.length > 255) {
      setRenameError("Tên nhóm tối đa 255 ký tự.");
      return;
    }

    setRenameError("");
    setRenameSubmitting(true);

    try {
      const linkedResponse = await getLinkedAccountsByGroupId(renameGroup.id);
      const masterAccount = linkedResponse.data.find((account) => account.accountType === "Master");

      if (!masterAccount) {
        setRenameError("Không tìm thấy tài khoản master liên kết với nhóm này.");
        return;
      }

      const masters = await filterZaloAccountsByType("master");
      const masterRecord = masters.find((account) => account.id === masterAccount.id);

      if (!masterRecord) {
        setRenameError("Không tìm thấy thông tin tài khoản master.");
        return;
      }

      const sessionResponse = await getCurrentZaloSession();
      const sessionList =
        sessionResponse.sessions.length > 0
          ? sessionResponse.sessions
          : sessionResponse.session
            ? [sessionResponse.session]
            : [];

      const matchingSession = sessionList.find((session) => session.user.uid === masterRecord.zaloId);

      if (!matchingSession) {
        setRenameError(
          "Chưa có phiên Zalo cho tài khoản master. Vui lòng đăng nhập Zalo (QR) cho master trước.",
        );
        return;
      }

      const sessionValidity = await ensureZaloSessionValid(matchingSession.id, {
        label: matchingSession.user.displayName || masterRecord.name,
      });

      if (!sessionValidity.ok) {
        setRenameError(sessionValidity.reason);
        return;
      }

      await changeZaloGroupName(renameGroup.id, {
        group_name: trimmedName,
        sessionId: matchingSession.id,
        masterZaloAccountId: masterRecord.id,
      });

      showToast("Đã đổi tên nhóm trên Zalo.", "success");
      handleCloseRenameModal();
      await loadGroups(page);
    } catch (requestError) {
      const message =
        requestError instanceof Error ? requestError.message : "Không thể đổi tên nhóm.";
      setRenameError(message);
    } finally {
      setRenameSubmitting(false);
    }
  }, [handleCloseRenameModal, loadGroups, newGroupName, page, renameGroup, showToast]);

  const getGroupActionItems = useCallback(
    (group: ZaloGroup): ActionItem[] => {
      const items: ActionItem[] = [
        {
          label: "Xem thông tin nhóm",
          icon: <HiOutlineInformationCircle className="h-5 w-5" />,
          onClick: () => void handleOpenGroupInfoModal(group),
        },
      ];

      if (group._count.accountMaps > 0) {
        items.push({
          label: "Tài khoản liên kết",
          icon: <HiOutlineUserGroup className="h-5 w-5" />,
          onClick: () => void handleOpenLinkedAccountsModal(group),
        });
      }

      items.push({
        label: "Đổi tên nhóm",
        icon: <HiOutlinePencilSquare className="h-5 w-5" />,
        onClick: () => handleOpenRenameModal(group),
      });

      return items;
    },
    [handleOpenGroupInfoModal, handleOpenLinkedAccountsModal, handleOpenRenameModal],
  );

  const groupInfoRows = useMemo(
    () => (groupInfoTarget ? buildGroupInfoRows(groupInfoTarget, groupInfoPayload) : []),
    [groupInfoPayload, groupInfoTarget],
  );

  const pageSummary = useMemo(() => {
    if (meta.total === 0) {
      return "Chưa có dữ liệu";
    }

    const start = (meta.page - 1) * meta.limit + 1;
    const end = Math.min(meta.page * meta.limit, meta.total);

    return `Hiển thị ${start}-${end} / ${meta.total} nhóm`;
  }, [meta]);

  const serverMetadataSyncBanner =
    serverGroupMetadataSync?.groupSyncEnabled === true &&
    serverGroupMetadataSync.status === "RUNNING";

  const serverSyncStartedHint = serverGroupMetadataSync?.startedAt
    ? ` (bắt đầu ${new Intl.DateTimeFormat("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(serverGroupMetadataSync.startedAt))})`
    : "";

  return (
    <div className="min-w-0 flex-1 overflow-y-auto p-8">
      <PageHeader
        title="Danh sách nhóm Zalo"
        description="Quản lý toàn bộ nhóm Zalo trong hệ thống"
      />

      <div className="overflow-hidden rounded-xl bg-surface-container-lowest shadow-sm shadow-slate-200/50">
        {serverMetadataSyncBanner ? (
          <div className="border-b border-amber-500/25 bg-amber-500/10 px-6 py-4 text-sm text-amber-900 dark:text-amber-100">
            <span className="font-medium">Lưu ý:</span> Hệ thống đang đồng bộ metadata nhóm Zalo từ tài khoản master (cron nền). Danh sách nhóm có thể
            cập nhật sau khi đợt đồng bộ hoàn tất.{serverSyncStartedHint}
          </div>
        ) : null}

        {isSyncing ? (
          <div className="border-b border-primary/10 bg-primary/5 px-6 py-4 text-sm text-primary">
            Đang cập nhật tên nhóm... Đợt này xử lý {currentBatchSize} nhóm, còn khoảng{" "}
            {Math.max(pendingCount - currentBatchSize, 0)} nhóm chưa cập nhật.
          </div>
        ) : null}

        {!isSyncing && lastError ? (
          <div className="border-b border-outline-variant/10 bg-surface-container-low px-6 py-4 text-sm text-on-surface-variant">
            Đợt cập nhật tên nhóm gần nhất có lỗi: {lastError}
          </div>
        ) : null}

        {error ? (
          <div className="border-b border-error/20 bg-error/10 px-6 py-4 text-sm text-error">{error}</div>
        ) : null}

        <div className="rounded-xl bg-surface-container-lowest px-6 py-4">
          <div className="flex flex-wrap items-center gap-2">
            <input
              className="w-80 rounded-xl border-none bg-surface-container-low py-2 pl-4 pr-4 text-sm transition-all placeholder:text-black focus:bg-white focus:ring-2 focus:ring-primary/20"
              placeholder="Tìm theo tên nhóm"
              type="text"
              value={keywordSearch}
              onChange={(event) => setKeywordSearch(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  void handleSearch();
                }
              }}
            />
            <Button
              className="h-9"
              startIcon={<HiOutlineFunnel className="h-5 w-5" />}
              onClick={() => handleSearch()}
            >
              Tìm kiếm
            </Button>
          </div>
        </div>

        <DataTableScroll freezeFirstColumn={true}>
        <table className={dataTableClassName}>
          <thead>
            <tr className="bg-surface-container-low/50">
              <th
                className={`text-sm px-6 py-3 text-label-sm font-normal tracking-wider text-on-surface ${FROZEN_GROUP_NAME_COL}`}
              >
                Tên nhóm
              </th>
              <th className="text-sm px-6 py-3 text-label-sm tracking-wider text-on-surface font-normal">
                Số tài khoản
              </th>
              <th className="text-sm px-6 py-3 text-label-sm tracking-wider text-on-surface font-normal">
                Số tin nhắn
              </th>
              <th className="text-sm px-6 py-3 text-label-sm tracking-wider text-on-surface font-normal">
                Ngày tạo
              </th>
              <th className="text-sm px-6 py-3 text-label-sm tracking-wider text-on-surface font-normal">
                Thao tác
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
                  {activeKeyword.trim()
                    ? "Không có nhóm Zalo nào khớp từ khóa."
                    : "Chưa có nhóm Zalo nào."}
                </td>
              </tr>
            ) : (
              groups.map((group) => (
                <tr key={group.id} className="group transition-colors hover:bg-surface-container-low/30">
                  <td className={`px-6 py-3 ${FROZEN_GROUP_NAME_COL}`}>
                    <div
                      className={`body-md text-sm font-semibold text-on-surface ${dataTableFrozenFirstColumnInnerClass}`}
                    >
                      {group.groupName}
                    </div>
                  </td>

                  <td className="px-6 py-3">
                    <span className="font-medium text-on-surface text-sm">{group._count.accountMaps}</span>
                  </td>

                  <td className="px-6 py-3">
                    <span className="font-medium text-on-surface text-sm">{group._count.messages}</span>
                  </td>

                  <td className="px-6 py-3">
                    <div className="text-sm text-on-surface-variant">{formatDate(group.createdAt)}</div>
                  </td>

                  <td className="px-6 py-3 text-right">
                    <ActionMenu items={getGroupActionItems(group)} />
                  </td>
                </tr>
              ))
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
        open={openLinkedAccountsModal}
        title={
          selectedGroup
            ? `Tài khoản liên kết — ${selectedGroup.groupName}`
            : "Tài khoản liên kết"
        }
        buttonText=""
        modalWidth="800px"
        onClose={handleCloseLinkedAccountsModal}
      >
        {linkedAccountsError ? (
          <div className="rounded-lg border border-error/20 bg-error/10 px-4 py-3 text-sm text-error">
            {linkedAccountsError}
          </div>
        ) : null}

        <DataTableScroll>
          <table className={dataTableClassName}>
            <thead>
              <tr className="bg-surface-container-low/50">
                <th className="text-sm px-6 py-3 text-label-sm font-normal tracking-wider text-on-surface">
                  Tên
                </th>
                <th className="text-sm px-6 py-3 text-label-sm font-normal tracking-wider text-on-surface">
                  Số điện thoại
                </th>
                <th className="text-sm px-6 py-3 text-label-sm font-normal tracking-wider text-on-surface">
                  Loại tài khoản
                </th>
                <th className="text-sm px-6 py-3 text-label-sm font-normal tracking-wider text-on-surface">
                  Ngày liên kết
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-outline-variant/10">
              {linkedAccountsLoading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-10 text-center text-sm text-on-surface-variant">
                    Đang tải danh sách tài khoản...
                  </td>
                </tr>
              ) : linkedAccounts.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-10 text-center text-sm text-on-surface-variant">
                    {linkedAccountsError
                      ? "Không thể hiển thị danh sách tài khoản."
                      : "Chưa có tài khoản nào liên kết với nhóm này."}
                  </td>
                </tr>
              ) : (
                linkedAccounts.map((account) => (
                  <tr
                    key={account.id}
                    className="group transition-colors hover:bg-surface-container-low/30"
                  >
                    <td className="px-6 py-3">
                      <div className={`body-md text-sm font-semibold text-on-surface ${dataTableFrozenFirstColumnInnerClass}`}>
                        {account.name || "—"}
                      </div>
                    </td>

                    <td className="px-6 py-3 text-sm">
                      <div className="body-md text-[#004ac6]">{account.phone || "—"}</div>
                    </td>

                    <td className="px-6 py-3">
                      {account.accountType === "Master" ? (
                        <Badge className="text-xs" variant="error">
                          Master
                        </Badge>
                      ) : (
                        <Badge className="text-xs" variant="default">
                          Child
                        </Badge>
                      )}
                    </td>

                    <td className="px-6 py-3">
                      <div className="text-sm text-on-surface-variant">
                        {formatDateTime(account.joinedAt)}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </DataTableScroll>

        {!linkedAccountsLoading && linkedAccounts.length > 0 ? (
          <p className="text-sm text-on-surface-variant">
            Tổng cộng {linkedAccounts.length} tài khoản liên kết.
          </p>
        ) : null}
      </Modal>

      <Modal
        open={openGroupInfoModal}
        title={
          groupInfoTarget
            ? `Xem thông tin nhóm — ${groupInfoTarget.groupName}`
            : "Xem thông tin nhóm"
        }
        buttonText=""
        modalWidth="800px"
        onClose={handleCloseGroupInfoModal}
      >
        {groupInfoError ? (
          <div className="rounded-lg border border-error/20 bg-error/10 px-4 py-3 text-sm text-error">
            {groupInfoError}
          </div>
        ) : null}

        <DataTableScroll>
          <table className={dataTableClassName}>
            <thead>
              <tr className="bg-surface-container-low/50">
                <th className="text-sm px-6 py-3 text-label-sm font-normal tracking-wider text-on-surface">
                  Trường
                </th>
                <th className="text-sm px-6 py-3 text-label-sm font-normal tracking-wider text-on-surface">
                  Giá trị
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-outline-variant/10">
              {groupInfoLoading ? (
                <tr>
                  <td colSpan={2} className="px-6 py-10 text-center text-sm text-on-surface-variant">
                    Đang tải thông tin nhóm từ Zalo...
                  </td>
                </tr>
              ) : groupInfoRows.length === 0 ? (
                <tr>
                  <td colSpan={2} className="px-6 py-10 text-center text-sm text-on-surface-variant">
                    {groupInfoError
                      ? "Không thể hiển thị thông tin nhóm."
                      : "Không có dữ liệu thông tin nhóm."}
                  </td>
                </tr>
              ) : (
                groupInfoRows.map((row) => (
                  <tr
                    key={row.key}
                    className="group transition-colors hover:bg-surface-container-low/30"
                  >
                    <td className="px-6 py-3">
                      <div
                        className={`body-md text-sm font-semibold text-on-surface ${dataTableFrozenFirstColumnInnerClass}`}
                      >
                        {row.label}
                      </div>
                    </td>

                    <td className="px-6 py-3">
                      <div className="whitespace-pre-wrap break-all text-sm text-on-surface-variant">
                        {row.value}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </DataTableScroll>

        {!groupInfoLoading && groupInfoRows.length > 0 ? (
          <p className="text-sm text-on-surface-variant">
            Dữ liệu lấy từ Zalo qua phiên đang chọn ({groupInfoRows.length} trường).
          </p>
        ) : null}
      </Modal>

      <Modal
        open={openRenameModal}
        title={renameGroup ? `Đổi tên nhóm — ${renameGroup.groupName}` : "Đổi tên nhóm"}
        onClose={() => {
          if (!renameSubmitting) {
            handleCloseRenameModal();
          }
        }}
        onSubmit={() => void handleSubmitRenameGroup()}
        loading={renameSubmitting}
        loadingText="Đang đổi tên..."
        buttonText="Lưu tên mới"
        cancelText="Hủy"
      >
        <div>
          <label className="block text-sm font-medium text-on-surface" htmlFor="group-rename-input">
            Tên nhóm mới
          </label>
          <input
            id="group-rename-input"
            className="mt-2 w-full rounded-lg border-transparent bg-surface-container-low px-4 py-2.5 text-sm transition-all placeholder:text-outline focus:border-primary focus:ring-2 focus:ring-primary-fixed"
            placeholder="Nhập tên nhóm mới"
            type="text"
            value={newGroupName}
            maxLength={255}
            disabled={renameSubmitting}
            onChange={(event) => {
              setNewGroupName(event.target.value);
              if (renameError) {
                setRenameError("");
              }
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                void handleSubmitRenameGroup();
              }
            }}
          />
          {renameError ? (
            <div className="mt-2">
              <FormError message={renameError} />
            </div>
          ) : null}
          <p className="mt-2 text-xs text-on-surface-variant">
            Tên sẽ được cập nhật trên Zalo (qua tài khoản master) và trong hệ thống.
          </p>
        </div>
      </Modal>
    </div>
  );
}
