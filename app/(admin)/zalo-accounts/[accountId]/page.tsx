"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  HiArrowLongLeft,
  HiChatBubbleLeftRight,
  HiMiniUserMinus,
  HiMiniUserPlus,
  HiOutlineTrash,
  HiUserGroup,
  HiUserMinus,
} from "react-icons/hi2";
import ActionMenu, { type ActionItem } from "@/components/features/ActionMenu";
import GroupFilterSearchField from "@/components/features/GroupFilterSearchField";
import GroupSearchCombobox from "@/components/features/GroupSearchCombobox";
import Modal from "@/components/features/Modal";
import PageHeader from "@/components/features/PageHeader";
import Pagination from "@/components/features/Pagination";
import { useToast } from "@/components/features/Toast";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import { DataTableScroll, dataTableClassName } from "@/components/ui/DataTableScroll";
import { cancelFriendZaloAccounts, getZaloAccounts, makeFriendZaloAccounts } from "@/lib/api/zalo-accounts";
import { buildSendMessageFormData, MESSAGE_SEND_REQUEST_TIMEOUT_MS } from "@/lib/api/messages";
import { apiRequest } from "@/lib/api/client";
import { getZaloGroupsByAccountId, inviteMemberToZaloGroup, removeMemberFromZaloGroup } from "@/lib/api/zalo-groups";
import { getCurrentZaloSession } from "@/lib/zalo/client";
import type {
  PaginationMeta,
  SendMessageResponse,
  ZaloAccount,
  ZaloAccountChild,
  ZaloGroup,
} from "@/lib/api/types";

const TABLE_PAGE_SIZE = 10;
const GROUP_FILTER_DEBOUNCE_MS = 350;
const TEST_MODAL_GROUPS_LIMIT = 500;
const MAX_TEST_MESSAGE_FILES = 20;
const MAX_TEST_MESSAGE_FILE_BYTES = 25 * 1024 * 1024;
/** Bật `true`: chỉ log ra console (và toast), không gọi `POST /messages/send` — tắt khi xong thử. */
const TEST_MESSAGE_DRY_RUN = false;
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

function formatFileSize(bytes: number) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
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
  const [groupFilterQuery, setGroupFilterQuery] = useState("");
  const [debouncedGroupFilter, setDebouncedGroupFilter] = useState("");
  const [submittingFriendChildId, setSubmittingFriendChildId] = useState<string | null>(null);
  const [submittingFriendAction, setSubmittingFriendAction] = useState<"make" | "unfriend" | null>(null);

  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [inviteTargetChild, setInviteTargetChild] = useState<ZaloAccountChild | null>(null);
  const [inviteSelectedGroup, setInviteSelectedGroup] = useState<ZaloGroup | null>(null);
  const [inviteSubmitting, setInviteSubmitting] = useState(false);

  const [removeFromGroupModalOpen, setRemoveFromGroupModalOpen] = useState(false);
  const [removeTargetChild, setRemoveTargetChild] = useState<ZaloAccountChild | null>(null);
  const [removeSelectedGroup, setRemoveSelectedGroup] = useState<ZaloGroup | null>(null);
  const [removeSubmitting, setRemoveSubmitting] = useState(false);

  const [testMessageModalOpen, setTestMessageModalOpen] = useState(false);
  const [testSendChildId, setTestSendChildId] = useState("");
  const [testSendGroupId, setTestSendGroupId] = useState("");
  const [testSendText, setTestSendText] = useState("");
  const [testModalGroups, setTestModalGroups] = useState<ZaloGroup[]>([]);
  const [testModalGroupsLoading, setTestModalGroupsLoading] = useState(false);
  const [testSendSubmitting, setTestSendSubmitting] = useState(false);
  const [testSendFiles, setTestSendFiles] = useState<File[]>([]);
  const [testFileInputKey, setTestFileInputKey] = useState(0);
  /** Cập nhật đồng bộ trong onChange / remove / mở-đóng modal — không dùng effect (tránh ghi đè ref). */
  const testSendFilesRef = useRef<File[]>([]);
  const testMessageFileInputRef = useRef<HTMLInputElement>(null);
  /** Khóa “Thêm/Xóa khỏi nhóm” theo child cho tới khi refetch xong; không ảnh hưởng kết bạn / hủy kết bạn. */
  const [groupOpsPendingChildIds, setGroupOpsPendingChildIds] = useState<Set<string>>(() => new Set());

  const loadAccountDetails = useCallback(async (): Promise<ZaloAccount | null> => {
    if (!accountId) {
      setError("Không tìm thấy ID tài khoản Zalo.");
      setLoading(false);
      return null;
    }

    setLoading(true);
    setError("");

    try {
      const response = await getZaloAccounts();
      const matchedAccount = response.find((item) => item.id === accountId) ?? null;

      if (!matchedAccount) {
        setAccount(null);
        setError("Không tìm thấy tài khoản Zalo.");
        return null;
      }

      if (!matchedAccount.isMaster) {
        setAccount(matchedAccount);
        setError("Trang chi tiết này chỉ áp dụng cho tài khoản master.");
        return null;
      }

      setAccount(matchedAccount);
      return matchedAccount;
    } catch (requestError) {
      setAccount(null);
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Không thể tải chi tiết tài khoản Zalo.",
      );
      return null;
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
        ...(debouncedGroupFilter ? { group_name: debouncedGroupFilter } : {}),
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
  }, [accountId, groupPage, debouncedGroupFilter]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedGroupFilter(groupFilterQuery.trim());
    }, GROUP_FILTER_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [groupFilterQuery]);

  useLayoutEffect(() => {
    setGroupPage(1);
  }, [debouncedGroupFilter]);

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
    setGroupFilterQuery("");
    setDebouncedGroupFilter("");
  }, [accountId]);

  const getFriendStatus = (childId: string) => friendStatusById.get(childId) ?? null;

  const isChildInactive = (child: ZaloAccountChild) => child.status === "INACTIVE";

  const getChildFriendPhone = (childId: string) =>
    account?.friends.find((friend) => friend.id === childId)?.phone?.trim() ?? "";

  const openInviteToGroupModal = (child: ZaloAccountChild) => {
    if (isChildInactive(child)) {
      showToast("Tài khoản con đang ở trạng thái không hoạt động, không thể thêm vào nhóm.", "error");
      return;
    }
    setInviteTargetChild(child);
    setInviteSelectedGroup(null);
    setInviteModalOpen(true);
  };

  const closeInviteToGroupModal = () => {
    setInviteModalOpen(false);
    setInviteTargetChild(null);
    setInviteSelectedGroup(null);
  };

  const handleInviteToGroupSubmit = async () => {
    if (!account || !inviteTargetChild || !inviteSelectedGroup) {
      showToast("Vui lòng chọn nhóm.", "error");
      return;
    }

    const friendStatus = getFriendStatus(inviteTargetChild.id);
    if (friendStatus !== "APPROVE") {
      showToast("Chỉ thêm vào nhóm khi tài khoản con đã kết bạn với master.", "error");
      return;
    }

    const currentChild = account.children.find((c) => c.id === inviteTargetChild.id);
    if (currentChild && isChildInactive(currentChild)) {
      showToast("Tài khoản con đang ở trạng thái không hoạt động, không thể thêm vào nhóm.", "error");
      return;
    }

    const opChildId = inviteTargetChild.id;
    setInviteSubmitting(true);
    setGroupOpsPendingChildIds((prev) => new Set(prev).add(opChildId));

    try {
      const sessionResponse = await getCurrentZaloSession();
      const sessionList =
        sessionResponse.sessions.length > 0
          ? sessionResponse.sessions
          : sessionResponse.session
            ? [sessionResponse.session]
            : [];

      const matchingSession = sessionList.find((session) => session.user.uid === account.zaloId);

      if (!matchingSession) {
        showToast(
          "Chưa có phiên Zalo cho master này. Vui lòng đăng nhập Zalo (QR) cho tài khoản master trước.",
          "error",
        );
        return;
      }

      const phoneFromFriend = getChildFriendPhone(inviteTargetChild.id);
      const payload = {
        groupId: inviteSelectedGroup.id,
        sessionId: matchingSession.id,
        masterZaloAccountId: account.id,
        childZaloAccountId: inviteTargetChild.id,
        ...(phoneFromFriend ? { phoneNumber: phoneFromFriend } : {}),
      };

      await inviteMemberToZaloGroup(payload);
      const invitedChildId = inviteTargetChild.id;
      const invitedName = inviteTargetChild.name;
      closeInviteToGroupModal();
      const nextAccount = await loadAccountDetails();
      const refreshedChild = nextAccount?.children.find((c) => c.id === invitedChildId);
      const nowInactive = refreshedChild ? isChildInactive(refreshedChild) : false;
      showToast(
        nowInactive
          ? `Đã thêm ${invitedName} vào nhóm. Tài khoản con hiện ở trạng thái không hoạt động (INACTIVE).`
          : `Đã thêm ${invitedName} vào nhóm.`,
        "success",
      );
      await loadAccountGroups();
    } catch (requestError) {
      showToast(
        requestError instanceof Error ? requestError.message : "Không thể thêm thành viên vào nhóm.",
        "error",
      );
    } finally {
      setInviteSubmitting(false);
      setGroupOpsPendingChildIds((prev) => {
        const next = new Set(prev);
        next.delete(opChildId);
        return next;
      });
    }
  };

  const openRemoveFromGroupModal = (child: ZaloAccountChild) => {
    setRemoveTargetChild(child);
    setRemoveSelectedGroup(null);
    setRemoveFromGroupModalOpen(true);
  };

  const closeRemoveFromGroupModal = () => {
    setRemoveFromGroupModalOpen(false);
    setRemoveTargetChild(null);
    setRemoveSelectedGroup(null);
  };

  const handleRemoveFromGroupSubmit = async () => {
    if (!account || !removeTargetChild || !removeSelectedGroup) {
      showToast("Vui lòng chọn nhóm.", "error");
      return;
    }

    const friendStatus = getFriendStatus(removeTargetChild.id);
    if (friendStatus !== "APPROVE") {
      showToast("Chỉ xóa khỏi nhóm khi tài khoản con đã kết bạn với master.", "error");
      return;
    }

    const opChildId = removeTargetChild.id;
    setRemoveSubmitting(true);
    setGroupOpsPendingChildIds((prev) => new Set(prev).add(opChildId));

    try {
      const sessionResponse = await getCurrentZaloSession();
      const sessionList =
        sessionResponse.sessions.length > 0
          ? sessionResponse.sessions
          : sessionResponse.session
            ? [sessionResponse.session]
            : [];

      const matchingSession = sessionList.find((session) => session.user.uid === account.zaloId);

      if (!matchingSession) {
        showToast(
          "Chưa có phiên Zalo cho master này. Vui lòng đăng nhập Zalo (QR) cho tài khoản master trước.",
          "error",
        );
        return;
      }

      const phoneFromFriend = getChildFriendPhone(removeTargetChild.id);
      const payload = {
        groupId: removeSelectedGroup.id,
        sessionId: matchingSession.id,
        masterZaloAccountId: account.id,
        childZaloAccountId: removeTargetChild.id,
        ...(phoneFromFriend ? { phoneNumber: phoneFromFriend } : {}),
      };

      await removeMemberFromZaloGroup(payload);
      showToast(`Đã xóa ${removeTargetChild.name} khỏi nhóm.`, "success");
      closeRemoveFromGroupModal();
      await loadAccountDetails();
      await loadAccountGroups();
    } catch (requestError) {
      showToast(
        requestError instanceof Error ? requestError.message : "Không thể xóa thành viên khỏi nhóm.",
        "error",
      );
    } finally {
      setRemoveSubmitting(false);
      setGroupOpsPendingChildIds((prev) => {
        const next = new Set(prev);
        next.delete(opChildId);
        return next;
      });
    }
  };

  const openTestMessageModal = async () => {
    testSendFilesRef.current = [];
    setTestSendChildId("");
    setTestSendGroupId("");
    setTestSendText("");
    setTestSendFiles([]);
    setTestFileInputKey((k) => k + 1);
    setTestMessageModalOpen(true);

    if (!accountId) {
      return;
    }

    setTestModalGroupsLoading(true);
    setTestModalGroups([]);

    try {
      const response = await getZaloGroupsByAccountId(accountId, {
        page: 1,
        limit: TEST_MODAL_GROUPS_LIMIT,
      });
      setTestModalGroups(response.data);
    } catch (requestError) {
      showToast(
        requestError instanceof Error ? requestError.message : "Không thể tải danh sách nhóm.",
        "error",
      );
    } finally {
      setTestModalGroupsLoading(false);
    }
  };

  const closeTestMessageModal = () => {
    testSendFilesRef.current = [];
    setTestMessageModalOpen(false);
    setTestSendChildId("");
    setTestSendGroupId("");
    setTestSendText("");
    setTestSendFiles([]);
    setTestFileInputKey((k) => k + 1);
    setTestModalGroups([]);
  };

  const handleTestMessageFilesChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { files } = event.target;
    if (!files?.length) {
      return;
    }
    const incoming = Array.from(files);
    for (const file of incoming) {
      if (file.size > MAX_TEST_MESSAGE_FILE_BYTES) {
        showToast(`File "${file.name}" vượt quá 25 MB.`, "error");
        return;
      }
    }
    setTestSendFiles((prev) => {
      const space = MAX_TEST_MESSAGE_FILES - prev.length;
      if (space <= 0) {
        queueMicrotask(() => {
          showToast(`Chỉ gửi tối đa ${MAX_TEST_MESSAGE_FILES} file.`, "info");
        });
        return prev;
      }
      const toAdd = incoming.slice(0, space);
      if (incoming.length > space) {
        queueMicrotask(() => {
          showToast(
            `Chỉ thêm được ${toAdd.length} file (tối đa ${MAX_TEST_MESSAGE_FILES} file mỗi lần gửi).`,
            "info",
          );
        });
      }
      const next = [...prev, ...toAdd];
      testSendFilesRef.current = next;
      return next;
    });
  };

  const handleRemoveTestMessageFile = (index: number) => {
    setTestSendFiles((prev) => {
      const next = prev.filter((_, i) => i !== index);
      testSendFilesRef.current = next;
      return next;
    });
  };

  const handleTestSendSubmit = async () => {
    const trimmed = testSendText.trim();
    const fromRef = testSendFilesRef.current;
    const fromState = testSendFiles;
    const fromInput = testMessageFileInputRef.current?.files?.length
      ? Array.from(testMessageFileInputRef.current.files)
      : [];
    const fileList =
      fromRef.length > 0
        ? [...fromRef]
        : fromState.length > 0
          ? [...fromState]
          : fromInput;

    if (!testSendChildId || !testSendGroupId) {
      showToast("Vui lòng chọn tài khoản con và nhóm.", "error");
      return;
    }
    if (!trimmed && fileList.length === 0) {
      showToast("Nhập nội dung hoặc chọn ít nhất một file đính kèm.", "error");
      return;
    }

    setTestSendSubmitting(true);

    try {
      const formData = buildSendMessageFormData({
        zaloAccountId: testSendChildId,
        groupId: testSendGroupId,
        text: trimmed,
        files: fileList.length > 0 ? fileList : undefined,
      });

      const formDataLog: { key: string; value: string; file?: { name: string; size: number } }[] = [];
      formData.forEach((value, key) => {
        if (value instanceof File) {
          formDataLog.push({ key, value: `[File: ${value.name}]`, file: { name: value.name, size: value.size } });
        } else {
          formDataLog.push({ key, value: String(value) });
        }
      });

      console.log("[Gửi tin test] snapshot trước khi gửi:", {
        dryRun: TEST_MESSAGE_DRY_RUN,
        zaloAccountId: testSendChildId,
        groupId: testSendGroupId,
        text: trimmed,
        fileCount: fileList.length,
        fromRef: fromRef.length,
        fromState: fromState.length,
        fromInput: fromInput.length,
        files: fileList.map((f) => ({ name: f.name, size: f.size, type: f.type })),
        formDataEntries: formDataLog,
      });

      if (TEST_MESSAGE_DRY_RUN) {
        if (formDataLog.filter((e) => e.key === "files").length === 0 && fileList.length > 0) {
          console.error("[Gửi tin test] LỖI: có file trong list nhưng FormData thiếu part `files`.");
        }
        showToast("Chế độ DRY RUN: đã log console — chưa gọi API. Đặt TEST_MESSAGE_DRY_RUN = false khi sẵn sàng gửi thật.", "info");
        return;
      }

      await apiRequest<SendMessageResponse>("/messages/send", {
        method: "POST",
        body: formData,
        timeoutMs: MESSAGE_SEND_REQUEST_TIMEOUT_MS,
      });
      showToast("Đã gửi tin nhắn test thành công.", "success");
      closeTestMessageModal();
    } catch (requestError) {
      showToast(
        requestError instanceof Error ? requestError.message : "Không thể gửi tin nhắn test.",
        "error",
      );
    } finally {
      setTestSendSubmitting(false);
    }
  };

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
      const response = await makeFriendZaloAccounts({
        masterId: account.id,
        friendId: child.id,
      });

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
    const groupOpsPending = groupOpsPendingChildIds.has(child.id);

    if (friendStatus === "APPROVE" || friendStatus === "PENDING") {
      const items: ActionItem[] = [];

      if (friendStatus === "APPROVE") {
        if (!isChildInactive(child) && !groupOpsPending) {
          items.push({
            label: "Thêm vào nhóm",
            icon: <HiUserGroup />,
            onClick: () => void openInviteToGroupModal(child),
          });
        }
        if (!groupOpsPending) {
          items.push({
            label: "Xóa khỏi nhóm",
            icon: <HiUserMinus />,
            danger: true,
            onClick: () => void openRemoveFromGroupModal(child),
          });
        }
      }

      items.push({
        label:
          submittingFriendChildId === child.id && submittingFriendAction === "unfriend"
            ? "Đang hủy kết bạn..."
            : friendStatus === "PENDING"
              ? "Hủy lời mời"
              : "Hủy kết bạn",
        icon: <HiMiniUserMinus />,
        onClick: () => void handleUnFriend(child),
      });

      return items;
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
    <div className="min-w-0 flex-1 overflow-y-auto p-8">
      <Modal
        open={inviteModalOpen}
        title={
          inviteTargetChild
            ? `Thêm vào nhóm — ${inviteTargetChild.name}`
            : "Thêm vào nhóm"
        }
        onClose={() => {
          if (!inviteSubmitting) {
            closeInviteToGroupModal();
          }
        }}
        onSubmit={handleInviteToGroupSubmit}
        loading={inviteSubmitting}
        loadingText="Đang thêm..."
        buttonText="Thêm vào nhóm"
        cancelText="Hủy"
      >
        <div>
          <span className="block text-sm font-medium text-on-surface">Chọn nhóm</span>
          <div className="mt-2">
            <GroupSearchCombobox
              accountId={accountId}
              disabled={inviteSubmitting}
              value={inviteSelectedGroup}
              onChange={setInviteSelectedGroup}
              placeholder="Gõ để tìm theo tên nhóm…"
            />
          </div>
          <p className="mt-2 text-xs text-on-surface-variant">
            Danh sách lọc theo nhóm đã liên kết với master này.
          </p>
        </div>
      </Modal>

      <Modal
        open={removeFromGroupModalOpen}
        title={
          removeTargetChild ? `Xóa khỏi nhóm — ${removeTargetChild.name}` : "Xóa khỏi nhóm"
        }
        onClose={() => {
          if (!removeSubmitting) {
            closeRemoveFromGroupModal();
          }
        }}
        onSubmit={handleRemoveFromGroupSubmit}
        loading={removeSubmitting}
        loadingText="Đang xóa…"
        buttonText="Xóa khỏi nhóm"
        cancelText="Hủy"
      >
        <div>
          <span className="block text-sm font-medium text-on-surface">Chọn nhóm</span>
          <div className="mt-2">
            <GroupSearchCombobox
              accountId={accountId}
              disabled={removeSubmitting}
              value={removeSelectedGroup}
              onChange={setRemoveSelectedGroup}
              placeholder="Gõ để tìm theo tên nhóm…"
            />
          </div>
          <p className="mt-2 text-xs text-on-surface-variant">
            Danh sách lọc theo nhóm đã liên kết với master này.
          </p>
        </div>
      </Modal>

      <Modal
        open={testMessageModalOpen}
        title="Gửi tin nhắn test"
        modalWidth="540px"
        onClose={() => {
          if (!testSendSubmitting) {
            closeTestMessageModal();
          }
        }}
        onSubmit={() => void handleTestSendSubmit()}
        loading={testSendSubmitting}
        loadingText="Đang gửi…"
        buttonText="Gửi"
        cancelText="Hủy"
      >
        <div className="space-y-4">
          {TEST_MESSAGE_DRY_RUN ? (
            <p className="rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-xs text-on-surface">
              Đang bật <strong>DRY RUN</strong>: bấm Gửi chỉ ghi <code>console.log</code>, không gọi API. Đổi
              hằng số <code>TEST_MESSAGE_DRY_RUN</code> thành <code>false</code> trong mã nguồn trang này khi muốn
              gửi thật.
            </p>
          ) : null}
          <label className="block text-sm font-medium text-on-surface">
            Tài khoản con
            <select
              className="mt-2 block w-full rounded-lg border border-outline-variant/30 bg-surface-container-lowest px-3 py-2 text-sm text-on-surface shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              value={testSendChildId}
              onChange={(event) => setTestSendChildId(event.target.value)}
              disabled={testSendSubmitting || childAccounts.length === 0}
            >
              <option value="">— Chọn tài khoản con —</option>
              {childAccounts.map((child) => (
                <option key={child.id} value={child.id}>
                  {child.name}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm font-medium text-on-surface">
            Nhóm (của master đang xem)
            {testModalGroupsLoading ? (
              <p className="mt-2 text-sm text-on-surface-variant">Đang tải danh sách nhóm…</p>
            ) : (
              <select
                className="mt-2 block w-full rounded-lg border border-outline-variant/30 bg-surface-container-lowest px-3 py-2 text-sm text-on-surface shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                value={testSendGroupId}
                onChange={(event) => setTestSendGroupId(event.target.value)}
                disabled={testSendSubmitting || testModalGroups.length === 0}
              >
                <option value="">— Chọn nhóm —</option>
                {testModalGroups.map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.groupName}
                  </option>
                ))}
              </select>
            )}
            <p className="mt-1 text-xs text-on-surface-variant">
              Backend yêu cầu tài khoản con có trong nhóm và đã đăng nhập Zalo (QR) dưới user hiện tại.
            </p>
          </label>

          <label className="block text-sm font-medium text-on-surface">
            Nội dung
            <textarea
              className="mt-2 block w-full min-h-[120px] rounded-lg border border-outline-variant/30 bg-surface-container-lowest px-3 py-2 text-sm text-on-surface shadow-sm placeholder:text-on-surface-variant/70 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder="Nhập nội dung (có thể để trống nếu chỉ gửi file)…"
              value={testSendText}
              onChange={(event) => setTestSendText(event.target.value)}
              disabled={testSendSubmitting}
              rows={4}
            />
            <p className="mt-1 text-xs text-on-surface-variant font-normal">
              Bắt buộc có nội dung hoặc ít nhất một file đính kèm.
            </p>
          </label>

          <div>
            <span className="block text-sm font-medium text-on-surface">Đính kèm</span>
            <p className="mt-1 text-xs text-on-surface-variant">
              Có thể chọn nhiều file trong một lần. Tối đa 20 file, mỗi file tối đa 25 MB.
            </p>
            <input
              key={testFileInputKey}
              ref={testMessageFileInputRef}
              type="file"
              multiple
              className="mt-2 block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-primary/10 file:px-3 file:py-1.5 file:text-on-surface"
              onChange={handleTestMessageFilesChange}
              disabled={testSendSubmitting}
            />
            {testSendFiles.length > 0 ? (
              <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto rounded-lg border border-outline-variant/20 bg-surface-container-low/50 p-2">
                {testSendFiles.map((file, index) => (
                  <li
                    key={`${file.name}-${file.size}-${index}`}
                    className="flex items-center gap-2 text-xs text-on-surface"
                  >
                    <span className="min-w-0 flex-1 truncate" title={file.name}>
                      {file.name}
                    </span>
                    <span className="shrink-0 text-on-surface-variant">{formatFileSize(file.size)}</span>
                    <button
                      type="button"
                      className="shrink-0 rounded p-1 text-error hover:bg-error/10"
                      onClick={() => handleRemoveTestMessageFile(index)}
                      disabled={testSendSubmitting}
                      aria-label={`Bỏ ${file.name}`}
                    >
                      <HiOutlineTrash className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </div>
      </Modal>

      <PageHeader
        title={account?.name ? `Chi tiết tài khoản: ${account.name}` : "Chi tiết tài khoản Zalo"}
        description="Quản lý tất cả tài khoản con và tất cả nhóm của tài khoản đang được xem"
        actions={
          <>
            <Button
              type="button"
              variant="outline"
              startIcon={<HiChatBubbleLeftRight className="h-4 w-4" />}
              onClick={() => void openTestMessageModal()}
              disabled={loading || !account?.isMaster}
            >
              Gửi tin nhắn test
            </Button>
            <Button variant="primary" startIcon={<HiArrowLongLeft className="h-4 w-4" />} onClick={() => router.push("/zalo-accounts")}>
              Quay lại danh sách tài khoản
            </Button>
          </>
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

          <DataTableScroll>
          <table className={dataTableClassName}>
            <thead>
              <tr className="bg-surface-container-low/50">
                <th className="dataTableFrozenHeaderClass text-sm px-6 py-3 text-label-sm tracking-wider text-on-surface font-normal">
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
                  <td colSpan={4} className="px-6 py-10 text-center text-sm text-on-surface-variant">
                    Đang tải danh sách tài khoản con...
                  </td>
                </tr>
              ) : childAccounts.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-10 text-center text-sm text-on-surface-variant">
                    Tài khoản master này chưa có child nào.
                  </td>
                </tr>
              ) : (
                paginatedChildAccounts.map((child) => (
                  <tr key={child.id} className="group transition-colors hover:bg-surface-container-low/30">
                    <td className="px-6 py-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="body-md font-semibold text-on-surface text-sm">{child.name}</span>
                        {isChildInactive(child) ? (
                          <Badge variant="error" className="text-xs">
                            Không hoạt động
                          </Badge>
                        ) : null}
                      </div>
                    </td>
                    <td className="dataTableFrozenCellClass px-6 py-3 text-sm text-on-surface">{child.groupCount}</td>
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
          </DataTableScroll>

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
          <div className="flex flex-col gap-3 border-b border-outline-variant/10 px-6 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
            <h3 className="shrink-0 text-lg font-semibold text-on-surface">Nhóm</h3>
            <div className="min-w-0 w-full sm:max-w-sm lg:max-w-md">
              <GroupFilterSearchField
                value={groupFilterQuery}
                onChange={setGroupFilterQuery}
                placeholder="Gõ để lọc theo tên nhóm…"
              />
            </div>
          </div>

          {groupsError ? (
            <div className="border-b border-error/20 bg-error/10 px-6 py-4 text-sm text-error">
              {groupsError}
            </div>
          ) : null}

          <DataTableScroll>
          <table className={dataTableClassName}>
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
                  <td className="px-6 py-10 text-center text-sm text-on-surface-variant">
                    Đang tải danh sách group...
                  </td>
                </tr>
              ) : groups.length === 0 ? (
                <tr>
                  <td className="px-6 py-10 text-center text-sm text-on-surface-variant">
                    {debouncedGroupFilter
                      ? "Không có nhóm nào khớp bộ lọc."
                      : "Tài khoản master này chưa có dữ liệu group."}
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
          </DataTableScroll>

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
