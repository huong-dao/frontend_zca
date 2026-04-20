"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { HiArrowLongLeft, HiMiniUserMinus, HiMiniUserPlus } from "react-icons/hi2";
import ActionMenu, { type ActionItem } from "@/components/features/ActionMenu";
import PageHeader from "@/components/features/PageHeader";
import Pagination from "@/components/features/Pagination";
import { useToast } from "@/components/features/Toast";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import {
  approveFriendZaloAccounts,
  cancelFriendZaloAccounts,
  getZaloAccounts,
  makeFriendZaloAccounts,
} from "@/lib/api/zalo-accounts";
import { getZaloGroupsByAccountId } from "@/lib/api/zalo-groups";
import {
  getCurrentZaloSession,
  getFriendRequestStatus,
  removeFriend,
  sendFriendRequest,
  ZALO_SESSION_CHANGED_EVENT,
  ZaloClientError,
} from "@/lib/zalo/client";
import type { PaginationMeta, ZaloAccount, ZaloAccountChild, ZaloGroup } from "@/lib/api/types";

const TABLE_PAGE_SIZE = 10;
const DEFAULT_FRIEND_REQUEST_MESSAGE = "Xin chào, hãy kết bạn với tôi!";

const EMPTY_META: PaginationMeta = {
  page: 1,
  limit: TABLE_PAGE_SIZE,
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

export default function ZaloAccountDetailsPage() {
  const router = useRouter();
  const params = useParams<{ accountId: string }>();
  const accountId = typeof params.accountId === "string" ? params.accountId : "";
  const { showToast } = useToast();

  const [account, setAccount] = useState<ZaloAccount | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [childPage, setChildPage] = useState(1);
  const [groupPage, setGroupPage] = useState(1);
  const [groups, setGroups] = useState<ZaloGroup[]>([]);
  const [groupsMeta, setGroupsMeta] = useState<PaginationMeta>(EMPTY_META);
  const [groupsLoading, setGroupsLoading] = useState(true);
  const [groupsError, setGroupsError] = useState("");
  const [submittingFriendChildId, setSubmittingFriendChildId] = useState<string | null>(null);
  const [submittingFriendAction, setSubmittingFriendAction] = useState<"make" | "unfriend" | null>(null);
  const syncingPendingFriendsRef = useRef(false);
  const checkedPendingFriendIdsRef = useRef<string>("");
  const [masterZaloSessionId, setMasterZaloSessionId] = useState<string | null>(null);

  const syncMasterZaloSessionId = useCallback(async () => {
    if (!account?.zaloId) {
      setMasterZaloSessionId(null);
      return;
    }

    try {
      const response = await getCurrentZaloSession();
      const list =
        response.sessions.length > 0
          ? response.sessions
          : response.session
            ? [response.session]
            : [];
      const match = list.find((session) => session.user.uid === account.zaloId);
      setMasterZaloSessionId(match?.id ?? null);
    } catch {
      setMasterZaloSessionId(null);
    }
  }, [account?.zaloId]);

  useEffect(() => {
    void syncMasterZaloSessionId();
  }, [syncMasterZaloSessionId]);

  useEffect(() => {
    const handler = () => {
      void syncMasterZaloSessionId();
    };
    window.addEventListener(ZALO_SESSION_CHANGED_EVENT, handler);
    return () => {
      window.removeEventListener(ZALO_SESSION_CHANGED_EVENT, handler);
    };
  }, [syncMasterZaloSessionId]);

  const loadAccountDetails = useCallback(async () => {
    if (!accountId) {
      setError("Không tìm thấy ID tài khoản Zalo.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await getZaloAccounts();
      const matchedAccount = response.find((item) => item.id === accountId) ?? null;

      if (!matchedAccount) {
        setAccount(null);
        setError("Không tìm thấy tài khoản Zalo.");
        return;
      }

      if (!matchedAccount.isMaster) {
        setAccount(matchedAccount);
        setError("Trang chi tiết này chỉ áp dụng cho tài khoản master.");
        return;
      }

      setAccount(matchedAccount);
    } catch (requestError) {
      setAccount(null);
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Không thể tải chi tiết tài khoản Zalo.",
      );
    } finally {
      setLoading(false);
    }
  }, [accountId]);

  useEffect(() => {
    void loadAccountDetails();
  }, [loadAccountDetails]);

  const childAccounts = useMemo<ZaloAccountChild[]>(() => account?.children ?? [], [account]);
  const friendStatusById = useMemo(
    () =>
      new Map(
        (account?.friends ?? []).map((friend) => [friend.id, friend.status] as const),
      ),
    [account],
  );

  const childTotalPages = useMemo(() => {
    if (childAccounts.length === 0) {
      return 1;
    }

    return Math.ceil(childAccounts.length / TABLE_PAGE_SIZE);
  }, [childAccounts.length]);

  const paginatedChildAccounts = useMemo(() => {
    const startIndex = (childPage - 1) * TABLE_PAGE_SIZE;
    return childAccounts.slice(startIndex, startIndex + TABLE_PAGE_SIZE);
  }, [childAccounts, childPage]);

  const childSummary = useMemo(() => {
    if (childAccounts.length === 0) {
      return "Chưa có dữ liệu";
    }

    const start = (childPage - 1) * TABLE_PAGE_SIZE + 1;
    const end = Math.min(childPage * TABLE_PAGE_SIZE, childAccounts.length);

    return `Hiển thị ${start}-${end} / ${childAccounts.length} tài khoản con`;
  }, [childAccounts.length, childPage]);

  const groupSummary = useMemo(() => {
    if (groupsMeta.total === 0) {
      return "Chưa có dữ liệu";
    }

    const start = (groupsMeta.page - 1) * groupsMeta.limit + 1;
    const end = Math.min(groupsMeta.page * groupsMeta.limit, groupsMeta.total);

    return `Hiển thị ${start}-${end} / ${groupsMeta.total} group`;
  }, [groupsMeta]);

  const loadAccountGroups = useCallback(async () => {
    if (!accountId) {
      return;
    }

    setGroupsLoading(true);
    setGroupsError("");

    try {
      const response = await getZaloGroupsByAccountId(accountId, {
        page: groupPage,
        limit: TABLE_PAGE_SIZE,
      });

      setGroups(response.data);
      setGroupsMeta(response.meta);
    } catch (requestError) {
      setGroups([]);
      setGroupsMeta((currentMeta) => ({
        ...currentMeta,
        page: groupPage,
      }));
      setGroupsError(
        requestError instanceof Error ? requestError.message : "Không thể tải danh sách group.",
      );
    } finally {
      setGroupsLoading(false);
    }
  }, [accountId, groupPage]);

  useEffect(() => {
    if (!account?.isMaster) {
      setGroups([]);
      setGroupsMeta(EMPTY_META);
      setGroupsLoading(false);
      return;
    }

    void loadAccountGroups();
  }, [account?.isMaster, loadAccountGroups]);

  useEffect(() => {
    if (childPage > childTotalPages) {
      setChildPage(childTotalPages);
    }
  }, [childPage, childTotalPages]);

  useEffect(() => {
    setChildPage(1);
  }, [accountId]);

  useEffect(() => {
    setGroupPage(1);
  }, [accountId]);

  const getFriendStatus = (childId: string) => friendStatusById.get(childId) ?? null;
  const pendingChildAccounts = useMemo(
    () => childAccounts.filter((child) => friendStatusById.get(child.id) === "PENDING"),
    [childAccounts, friendStatusById],
  );

  const syncPendingFriendStatuses = useCallback(async () => {
    if (
      !account?.isMaster ||
      pendingChildAccounts.length === 0 ||
      syncingPendingFriendsRef.current ||
      !masterZaloSessionId
    ) {
      return;
    }

    const pendingChildIdsKey = pendingChildAccounts
      .map((child) => `${child.id}:${child.zaloId}`)
      .sort()
      .join("|");

    if (checkedPendingFriendIdsRef.current === pendingChildIdsKey) {
      return;
    }

    syncingPendingFriendsRef.current = true;
    checkedPendingFriendIdsRef.current = pendingChildIdsKey;

    try {
      let approvedCount = 0;

      for (const child of pendingChildAccounts) {
        const friendStatus = await getFriendRequestStatus(child.zaloId, masterZaloSessionId);

        if (friendStatus.is_friend) {
          await approveFriendZaloAccounts({
            masterId: account.id,
            friendId: child.id,
          });
          approvedCount += 1;
        }
      }

      if (approvedCount > 0) {
        await loadAccountDetails();
      }
    } catch (requestError) {
      if (requestError instanceof ZaloClientError && requestError.status === 401) {
        checkedPendingFriendIdsRef.current = "";
        return;
      }

      checkedPendingFriendIdsRef.current = "";
    } finally {
      syncingPendingFriendsRef.current = false;
    }
  }, [account, loadAccountDetails, masterZaloSessionId, pendingChildAccounts]);

  useEffect(() => {
    void syncPendingFriendStatuses();
  }, [syncPendingFriendStatuses]);

  const handleMakeFriend = async (child: ZaloAccountChild) => {
    if (!account) {
      return;
    }

    const friendStatus = getFriendStatus(child.id);

    if (friendStatus === "APPROVE") {
      showToast(`Tài khoản ${child.name} đã kết bạn với master này.`, "info");
      return;
    }

    if (friendStatus === "PENDING") {
      showToast(`Đã gửi lời mời kết bạn tới tài khoản ${child.name}.`, "info");
      return;
    }

    setSubmittingFriendChildId(child.id);
    setSubmittingFriendAction("make");

    try {
      if (!masterZaloSessionId) {
        showToast("Chưa có phiên Zalo cho tài khoản master. Vui lòng đăng nhập Zalo (QR) trước.", "error");
        return;
      }

      const response = await makeFriendZaloAccounts({
        masterId: account.id,
        friendId: child.id,
      });

      let sendFriendError: unknown = null;

      try {
        await sendFriendRequest(
          child.zaloId,
          account.name
            ? `Xin chào, mình là ${account.name}. Kết bạn nhé!`
            : DEFAULT_FRIEND_REQUEST_MESSAGE,
          masterZaloSessionId,
        );
      } catch (requestError) {
        sendFriendError = requestError;
      }

      let zaloFriendStatus: Awaited<ReturnType<typeof getFriendRequestStatus>> | null = null;
      try {
        zaloFriendStatus = await getFriendRequestStatus(child.zaloId, masterZaloSessionId);
      } catch {
        zaloFriendStatus = null;
      }

      // Hai phía đã là bạn trên Zalo: lưu quan hệ (make-friend đã tạo PENDING) rồi chuyển APPROVE.
      if (zaloFriendStatus?.is_friend) {
        await approveFriendZaloAccounts({
          masterId: account.id,
          friendId: child.id,
        });
        showToast(`Đã đồng bộ: ${child.name} đã là bạn bè trên Zalo.`, "success");
        await loadAccountDetails();
        return;
      }

      if (sendFriendError) {
        await cancelFriendZaloAccounts({
          masterId: account.id,
          friendId: child.id,
        });
        throw sendFriendError;
      }

      showToast(
        response.status === "PENDING"
          ? `Đã gửi lời mời kết bạn tới tài khoản ${child.name}.`
          : `Đã kết bạn với tài khoản ${child.name}.`,
        "success",
      );
      await loadAccountDetails();
    } catch (requestError) {
      showToast(
        requestError instanceof Error ? requestError.message : "Không thể tạo quan hệ kết bạn.",
        "error",
      );
    } finally {
      setSubmittingFriendChildId(null);
      setSubmittingFriendAction(null);
    }
  };

  const handleUnFriend = async (child: ZaloAccountChild) => {
    if (!account) {
      return;
    }

    const friendStatus = getFriendStatus(child.id);

    if (!friendStatus || friendStatus === "CANCEL") {
      showToast(`Tài khoản ${child.name} hiện chưa có quan hệ bạn bè đang hoạt động.`, "info");
      return;
    }

    setSubmittingFriendChildId(child.id);
    setSubmittingFriendAction("unfriend");

    try {
      if (friendStatus === "APPROVE") {
        if (!masterZaloSessionId) {
          showToast("Chưa có phiên Zalo cho tài khoản master. Vui lòng đăng nhập Zalo (QR) trước.", "error");
          return;
        }
        await removeFriend(child.zaloId, masterZaloSessionId);
      }

      await cancelFriendZaloAccounts({
        masterId: account.id,
        friendId: child.id,
      });
      showToast(`Đã hủy kết bạn với tài khoản ${child.name}.`, "success");
      await loadAccountDetails();
    } catch (requestError) {
      showToast(
        requestError instanceof Error ? requestError.message : "Không thể hủy quan hệ kết bạn.",
        "error",
      );
    } finally {
      setSubmittingFriendChildId(null);
      setSubmittingFriendAction(null);
    }
  };

  const getChildActionItems = (child: ZaloAccountChild): ActionItem[] => {
    const friendStatus = getFriendStatus(child.id);

    if (friendStatus === "APPROVE" || friendStatus === "PENDING") {
      return [
        {
          label:
            submittingFriendChildId === child.id && submittingFriendAction === "unfriend"
              ? "Đang hủy kết bạn..."
              : friendStatus === "PENDING"
                ? "Hủy lời mời"
                : "Hủy kết bạn",
          icon: <HiMiniUserMinus />,
          onClick: () => void handleUnFriend(child),
        },
      ];
    }

    return [
      {
        label:
          submittingFriendChildId === child.id && submittingFriendAction === "make"
            ? "Đang kết bạn..."
            : "Kết bạn",
        icon: <HiMiniUserPlus />,
        onClick: () => void handleMakeFriend(child),
      },
    ];
  };

  return (
    <div className="flex-1 overflow-y-auto p-8">
      <PageHeader
        title={account?.name ? `Chi tiết tài khoản: ${account.name}` : "Chi tiết tài khoản Zalo"}
        description="Quản lý tất cả tài khoản con và tất cả nhóm của tài khoản đang được xem"
        actions={
          <Button variant="primary" startIcon={<HiArrowLongLeft className="h-4 w-4" />} onClick={() => router.push("/zalo-accounts")}>
            Quay lại danh sách tài khoản
          </Button>
        }
      />

      {account ? (
        <div className="mb-6 flex flex-wrap items-center gap-3 rounded-xl bg-surface-container-lowest px-6 py-4 shadow-sm shadow-slate-200/50">
          <Badge variant="error" className="text-xs">Master</Badge>
          <div className="text-sm text-on-surface">
            <span className="font-semibold">Số điện thoại:</span> {account.phone || "-"}
          </div>
          <div className="text-sm text-on-surface">
            <span className="font-semibold">Ngày tạo:</span> {formatDate(account.createdAt)}
          </div>
        </div>
      ) : null}

      {error ? (
        <div className="mb-6 rounded-xl border border-error/20 bg-error/10 px-6 py-4 text-sm text-error">
          {error}
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="overflow-hidden rounded-xl bg-surface-container-lowest shadow-sm shadow-slate-200/50">
          <div className="border-b border-outline-variant/10 px-6 py-4">
            <h3 className="text-lg font-semibold text-on-surface">Tài khoản con</h3>
          </div>

          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="bg-surface-container-low/50">
                <th className="text-sm px-6 py-3 text-label-sm tracking-wider text-on-surface font-normal">
                  Tên
                </th>
                <th className="text-sm px-6 py-3 text-label-sm tracking-wider text-on-surface font-normal">
                  Số nhóm
                </th>
                <th className="text-sm px-6 py-3 text-label-sm tracking-wider text-on-surface font-normal">
                  
                </th>
                <th className="text-sm px-6 py-3 text-label-sm tracking-wider text-on-surface font-normal"></th>
              </tr>
            </thead>

            <tbody className="divide-y divide-outline-variant/10">
              {loading ? (
                <tr>
                  <td colSpan={3} className="px-6 py-10 text-center text-sm text-on-surface-variant">
                    Đang tải danh sách tài khoản con...
                  </td>
                </tr>
              ) : childAccounts.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-6 py-10 text-center text-sm text-on-surface-variant">
                    Tài khoản master này chưa có child nào.
                  </td>
                </tr>
              ) : (
                paginatedChildAccounts.map((child) => (
                  <tr key={child.id} className="group transition-colors hover:bg-surface-container-low/30">
                    <td className="px-6 py-3">
                      <div className="body-md font-semibold text-on-surface text-sm">{child.name}</div>
                    </td>
                    <td className="px-6 py-3 text-sm text-on-surface">{child.groupCount}</td>
                    <td className="px-6 py-3">
                      {getFriendStatus(child.id) === "APPROVE" ? (
                        <Badge variant="success" className="text-xs">Đã kết bạn</Badge>
                      ) : getFriendStatus(child.id) === "PENDING" ? (
                        <Badge variant="info" className="text-xs">Đã gửi lời mời</Badge>
                      ) : (
                        <Badge variant="warning" className="text-xs">Chưa kết bạn</Badge>
                      )}
                    </td>
                    <td className="px-6 py-3 text-right">
                      <ActionMenu items={getChildActionItems(child)} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          <div className="flex flex-col gap-4 border-t border-outline-variant/10 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-on-surface-variant">{childSummary}</div>

            <Pagination
              currentPage={childPage}
              totalPages={childTotalPages}
              onPageChange={setChildPage}
              disabled={loading}
            />
          </div>
        </section>

        <section className="overflow-hidden rounded-xl bg-surface-container-lowest shadow-sm shadow-slate-200/50">
          <div className="border-b border-outline-variant/10 px-6 py-4">
            <h3 className="text-lg font-semibold text-on-surface">Nhóm</h3>
          </div>

          {groupsError ? (
            <div className="border-b border-error/20 bg-error/10 px-6 py-4 text-sm text-error">
              {groupsError}
            </div>
          ) : null}

          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="bg-surface-container-low/50">
                <th className="text-sm px-6 py-3 text-label-sm tracking-wider text-on-surface font-normal">
                  Tên nhóm
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-outline-variant/10">
              {groupsLoading ? (
                <tr>
                  <td colSpan={2} className="px-6 py-10 text-center text-sm text-on-surface-variant">
                    Đang tải danh sách group...
                  </td>
                </tr>
              ) : groups.length === 0 ? (
                <tr>
                  <td colSpan={2} className="px-6 py-10 text-center text-sm text-on-surface-variant">
                    Tài khoản master này chưa có dữ liệu group.
                  </td>
                </tr>
              ) : (
                groups.map((group) => (
                  <tr
                    key={`${group.id}-${group.groupZaloId}`}
                    className="group transition-colors hover:bg-surface-container-low/30"
                  >
                    <td className="px-6 py-3">
                      <div className="body-md font-semibold text-on-surface text-sm">
                        {group.groupName}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          <div className="flex flex-col gap-4 border-t border-outline-variant/10 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-on-surface-variant">{groupSummary}</div>

            <Pagination
              currentPage={groupsMeta.page}
              totalPages={groupsMeta.totalPages}
              onPageChange={setGroupPage}
              disabled={groupsLoading}
            />
          </div>
        </section>
      </div>
    </div>
  );
}
