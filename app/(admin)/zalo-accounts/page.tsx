"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  HiMiniUserPlus,
  HiArrowPath,
  HiMiniQrCode,
  HiOutlineUserGroup,
  HiMiniEye,
  HiOutlineCheckCircle,
  HiMiniFaceSmile,
  HiOutlineArrowRightOnRectangle,
  HiOutlineUserCircle,
  HiOutlineExclamationTriangle,
  HiOutlineFunnel,
} from "react-icons/hi2";
import { useToast } from "@/components/features/Toast";
import ActionMenu, { type ActionItem } from "@/components/features/ActionMenu";
import Modal from "@/components/features/Modal";
import PageHeader from "@/components/features/PageHeader";
import Pagination from "@/components/features/Pagination";
import Button from "@/components/ui/Button";
import FormError from "@/components/ui/FormError";
import Badge from "@/components/ui/Badge";
import { useAuth } from "@/contexts/AuthContext";
import { createZaloGroupsBulk } from "@/lib/api/zalo-groups";
import { addChildZaloAccounts, createZaloAccount, filterZaloAccountsByType, getZaloAccounts, searchZaloAccounts, setZaloAccountMaster, updateZaloAccountGroupData } from "@/lib/api/zalo-accounts";
import { ApiError } from "@/lib/api/client";
import type { BulkCreateZaloGroupInput, ZaloAccount, ZaloAccountFilterType } from "@/lib/api/types";
import {
  bakeZaloSessionCookies,
  getAllGroups,
  getCurrentZaloSession,
  getQrLoginStatus,
  logoutZalo,
  notifyZaloSessionChanged,
  startQrLogin,
  ZALO_SESSION_CHANGED_EVENT,
} from "@/lib/zalo/client";
import type { PendingQrLoginSnapshot, PendingQrLoginStatus, ZaloSessionPublic } from "@/lib/zalo/types";

const PAGE_SIZE = 20;
const TABLE_COLUMN_COUNT = 8;
const QR_FINISHED_STATUSES: PendingQrLoginStatus[] = [
  "authenticated",
  "expired",
  "declined",
  "error",
];
const BULK_ACTION_ADD_CHILD = "add_child";

// SECTION: SHARED HELPERS
// Các helper bên dưới được dùng lại ở nhiều flow như render bảng, login QR và validate dữ liệu.
function formatDate(value: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}

function normalizeQrImageSrc(qrCode: string) {
  if (qrCode.startsWith("data:image")) {
    return qrCode;
  }

  return `data:image/png;base64,${qrCode}`;
}

function normalizeVietnamesePhoneNumber(phoneNumber: string) {
  const digits = phoneNumber.replace(/\D/g, "");

  if (!digits) {
    return "";
  }

  if (digits.startsWith("0084")) {
    return `0${digits.slice(4)}`;
  }

  if (digits.startsWith("84")) {
    return `0${digits.slice(2)}`;
  }

  return digits;
}

function isSameVietnamesePhoneNumber(left: string, right: string) {
  const normalizedLeft = normalizeVietnamesePhoneNumber(left);
  const normalizedRight = normalizeVietnamesePhoneNumber(right);

  return normalizedLeft !== "" && normalizedLeft === normalizedRight;
}

function normalizePhoneForApi(phoneNumber: string | undefined) {
  if (!phoneNumber) {
    return undefined;
  }

  const normalizedPhone = normalizeVietnamesePhoneNumber(phoneNumber);

  if (normalizedPhone.length < 9 || normalizedPhone.length > 15) {
    return undefined;
  }

  return normalizedPhone;
}

function isFinalQrStatus(status: PendingQrLoginStatus) {
  return QR_FINISHED_STATUSES.includes(status);
}

function hasGroupData(groupData?: Record<string, string>, accountId?: string) {
  return !!groupData && Object.keys(groupData).length > 0;
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export default function ZaloAccountsPage() {
  // SECTION: PAGE STATE
  // Gom toàn bộ state của trang để dễ tìm nhanh phần điều khiển modal, bảng dữ liệu và QR login.
  const router = useRouter();
  const { showToast } = useToast();
  const { user, loading: authLoading } = useAuth();
  const [openAddAccountModal, setOpenAddAccountModal] = useState(false);
  const [accounts, setAccounts] = useState<ZaloAccount[]>([]);
  const [masterAccountOptions, setMasterAccountOptions] = useState<ZaloAccount[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [phoneNumberError, setPhoneNumberError] = useState("");
  const [openQrModal, setOpenQrModal] = useState(false);
  const [reloadingQr, setReloadingQr] = useState(false);
  const [qrCode, setQrCode] = useState("");
  const [requestedPhoneNumber, setRequestedPhoneNumber] = useState("");
  const [qrModalError, setQrModalError] = useState("");
  const [qrLogin, setQrLogin] = useState<PendingQrLoginSnapshot | null>(null);
  const [savingAccount, setSavingAccount] = useState(false);
  const [openModalScanningGroups, setOpenModalScanningGroups] = useState(false);
  const [scanGroupMessage, setScanGroupMessage] = useState("");
  const [submittingAddAccount, setSubmittingAddAccount] = useState(false);
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>([]);
  const [selectedBulkAction, setSelectedBulkAction] = useState("");
  const [selectedMasterAccountId, setSelectedMasterAccountId] = useState("");
  const [submittingBulkAction, setSubmittingBulkAction] = useState(false);
  const [accountFilter, setAccountFilter] = useState<ZaloAccountFilterType>("all");

  const phoneNumberRef = useRef<HTMLInputElement>(null);
  const persistedSessionIdRef = useRef<string | null>(null);
  const selectAllVisibleCheckboxRef = useRef<HTMLInputElement>(null);
  const [zaloSessions, setZaloSessions] = useState<ZaloSessionPublic[]>([]);
  const [zaloLoggedIds, setZaloLoggedIds] = useState<Set<string>>(() => new Set());

  const [keywordSearch, setKeywordSearch] = useState("");

  // SECTION: FORM / MODAL RESET HELPERS
  const resetAddAccountForm = useCallback(() => {
    setPhoneNumberError("");
    if (phoneNumberRef.current) {
      phoneNumberRef.current.value = "";
    }
  }, []);

  const resetQrModalState = useCallback(() => {
    setReloadingQr(false);
    setQrModalError("");
    setQrLogin(null);
    setQrCode("");
    setRequestedPhoneNumber("");
    setSavingAccount(false);
    persistedSessionIdRef.current = null;
  }, []);

  // SECTION: CURRENT ZALO SESSION
  // Đồng bộ toàn bộ phiên Zalo (đa tài khoản) để highlight dòng và đăng xuất đúng session.
  const syncZaloSession = useCallback(async () => {
    const response = await getCurrentZaloSession();
    const list =
      response.sessions.length > 0
        ? response.sessions
        : response.session
          ? [response.session]
          : [];
    setZaloSessions(list);
    setZaloLoggedIds(new Set(list.map((session) => session.user.uid)));
    return response.session;
  }, []);

  const applyQrSnapshot = useCallback((snapshot: PendingQrLoginSnapshot) => {
    setQrLogin(snapshot);
    setQrCode(snapshot.qrCode ? normalizeQrImageSrc(snapshot.qrCode) : "");

    if (
      snapshot.status === "error" ||
      snapshot.status === "expired" ||
      snapshot.status === "declined"
    ) {
      setQrModalError(snapshot.error ?? "Phiên QR đã kết thúc.");
      return;
    }

    setQrModalError("");
  }, []);

  // SECTION: LOAD ACCOUNT LIST
  const loadAccounts = useCallback(async () => {
    setLoading(true);

    try {
      const response =
        accountFilter === "all"
          ? await getZaloAccounts()
          : await filterZaloAccountsByType(accountFilter);
      setAccounts(response);
    } catch (requestError) {
      showToast(getErrorMessage(requestError, "Không thể tải danh sách tài khoản Zalo."), "error");
    } finally {
      setLoading(false);
    }
  }, [accountFilter, showToast]);

  const loadMasterAccountOptions = useCallback(async () => {
    try {
      const response = await filterZaloAccountsByType("master");
      setMasterAccountOptions(response);
    } catch (requestError) {
      showToast(
        getErrorMessage(requestError, "Không thể tải danh sách tài khoản master."),
        "error",
      );
    }
  }, [showToast]);

  const handleCloseScanGroupsModal = useCallback(() => {
    setOpenModalScanningGroups(false);
    setScanGroupMessage("");
  }, []);

  const closeScanGroupsModalAfterDelay = useCallback(() => {
    window.setTimeout(() => {
      handleCloseScanGroupsModal();
    }, 3000);
  }, [handleCloseScanGroupsModal]);

  // SECTION: SCAN GROUPS - MASTER BULK CREATE
  // Với tài khoản master, dùng trực tiếp groupData vừa quét để bulk-create nhóm,
  // tránh gọi thêm nhiều request tới Zalo và làm tăng rủi ro bị giới hạn.
  const buildBulkCreateGroupsPayload = useCallback(async (groupData: Record<string, string>) => {
    return Object.entries(groupData).map(([groupId, groupName]) => ({
      group_name: groupName.trim() || `Nhóm ${groupId}`,
      group_zalo_id: groupId,
    }) satisfies BulkCreateZaloGroupInput);
  }, []);

  // SECTION: SESSION CHANGE LISTENER
  // Lắng nghe event để refresh trạng thái đăng nhập Zalo khi nơi khác trong app thay đổi session.
  useEffect(() => {
    void syncZaloSession().catch(() => {
      setZaloSessions([]);
      setZaloLoggedIds(new Set());
    });

    const handleSessionChanged = () => {
      void syncZaloSession().catch(() => {
        setZaloSessions([]);
        setZaloLoggedIds(new Set());
      });
    };

    window.addEventListener(ZALO_SESSION_CHANGED_EVENT, handleSessionChanged);
    return () => {
      window.removeEventListener(ZALO_SESSION_CHANGED_EVENT, handleSessionChanged);
    };
  }, [syncZaloSession]);

  // SECTION: QR LOGIN FLOW - START
  // Điểm bắt đầu của flow login QR: validate số, mở modal và gọi API lấy QR.
  const beginQrLogin = async (phoneNumber: string, isReload = false) => {
    const normalizedPhoneNumber = normalizePhoneForApi(phoneNumber);

    if (!normalizedPhoneNumber) {
      setQrModalError("Số điện thoại không hợp lệ để tạo mã QR đăng nhập.");
      return;
    }

    if (isReload) {
      setReloadingQr(true);
    } else {
      resetQrModalState();
      setOpenQrModal(true);
      setOpenAddAccountModal(false);
    }

    setQrModalError("");
    persistedSessionIdRef.current = null;
    setRequestedPhoneNumber(normalizedPhoneNumber);

    try {
      const response = await startQrLogin();
      applyQrSnapshot(response);

      if (response.status === "authenticated" && response.sessionId) {
        try {
          await bakeZaloSessionCookies(response.sessionId);
          notifyZaloSessionChanged();
        } catch {
          //
        }
      }
    } catch (requestError) {
      setQrModalError(getErrorMessage(requestError, "Không thể tạo mã QR đăng nhập."));
    } finally {
      if (isReload) {
        setReloadingQr(false);
      }
    }
  };

  // SECTION: ADD ACCOUNT BY PHONE
  // Luôn mở flow QR sau khi nhập số (đa phiên Zalo đồng thời, không phân biệt master/child).
  const handleSubmitPhoneNumber = async (phoneNumber: string) => {
    setPhoneNumberError("");

    const normalizedPhoneNumber = normalizePhoneForApi(phoneNumber);

    if (!normalizedPhoneNumber || normalizedPhoneNumber.length !== 10) {
      setPhoneNumberError("Số điện thoại không hợp lệ");
      return;
    }

    setSubmittingAddAccount(true);

    try {
      await beginQrLogin(normalizedPhoneNumber);
    } catch (requestError) {
      setPhoneNumberError(
        requestError instanceof Error ? requestError.message : "Không thể mở đăng nhập QR Zalo.",
      );
    } finally {
      setSubmittingAddAccount(false);
    }
  };

  // SECTION: ADD ACCOUNT MODAL
  const handleCloseAddAccountModal = useCallback(() => {
    setOpenAddAccountModal(false);
    setSubmittingAddAccount(false);
    resetAddAccountForm();
  }, [resetAddAccountForm]);

  const handleOpenAddAccountModal = () => {
    resetAddAccountForm();
    setOpenAddAccountModal(true);
  };

  // SECTION: QR LOGIN FLOW - MODAL ACTIONS
  // Các thao tác phụ trợ quanh modal QR: đóng modal, reload QR, bấm bắt đầu login, logout.
  const handleCloseQrModal = useCallback(() => {
    setOpenQrModal(false);
    resetQrModalState();
  }, [resetQrModalState]);

  const handleReloadQr = async () => {
    if (!requestedPhoneNumber) {
      return;
    }

    await beginQrLogin(requestedPhoneNumber, true);
  };

  const handleBeginQrLogin = async (phoneNumber: string) => {
    const normalizedPhoneNumber = normalizePhoneForApi(phoneNumber);

    if (!normalizedPhoneNumber) {
      showToast("Tài khoản này chưa có số điện thoại hợp lệ để tạo mã QR đăng nhập.", "error");
      return;
    }

    await beginQrLogin(normalizedPhoneNumber);
  };

  const handleLogoutZaloForAccount = async (account: ZaloAccount) => {
    const session = zaloSessions.find((item) => item.user.uid === account.zaloId);

    if (!session) {
      showToast("Không tìm thấy phiên đăng nhập Zalo cho tài khoản này.", "error");
      return;
    }

    try {
      await logoutZalo(session.id);
      await syncZaloSession();
      notifyZaloSessionChanged();
      showToast("Đã đăng xuất phiên Zalo của tài khoản này.", "success");
    } catch (requestError) {
      showToast(getErrorMessage(requestError, "Không thể đăng xuất Zalo."), "error");
    }
  };

  // SECTION: QR LOGIN FLOW - POLL STATUS
  // Poll trạng thái QR liên tục cho tới khi login thành công hoặc QR kết thúc.
  useEffect(() => {
    if (!openQrModal || !qrLogin?.id) {
      return;
    }

    if (isFinalQrStatus(qrLogin.status)) {
      return;
    }

    const timer = window.setTimeout(async () => {
      try {
        const nextStatus = await getQrLoginStatus(qrLogin.id);
        applyQrSnapshot(nextStatus);

        if (nextStatus.status === "authenticated" && nextStatus.sessionId) {
          try {
            await bakeZaloSessionCookies(nextStatus.sessionId);
            notifyZaloSessionChanged();
          } catch {
            // Cookie có thể đã có từ GET; bỏ qua nếu bake thất bại.
          }
        }
      } catch (requestError) {
        setQrModalError(getErrorMessage(requestError, "Không thể cập nhật trạng thái QR."));
      }
    }, 1500);

    return () => {
      window.clearTimeout(timer);
    };
  }, [applyQrSnapshot, openQrModal, qrLogin]);

  useEffect(() => {
    if (authLoading || !user) {
      return;
    }

    void loadAccounts();
    void loadMasterAccountOptions();
  }, [authLoading, loadAccounts, loadMasterAccountOptions, user]);

  // SECTION: QR LOGIN FLOW - SAVE AUTHENTICATED ACCOUNT
  // Đây là đoạn "kết thúc" flow login QR:
  // khi Zalo xác thực xong thì lưu tài khoản vào hệ thống, refresh session và đóng modal.
  useEffect(() => {
    if (!qrLogin?.sessionId || !qrLogin.sessionUser || qrLogin.status !== "authenticated") {
      return;
    }

    const sessionId = qrLogin.sessionId;
    const sessionUser = qrLogin.sessionUser;

    if (persistedSessionIdRef.current === sessionId) {
      return;
    }

    let cancelled = false;
    persistedSessionIdRef.current = sessionId;
    setSavingAccount(true);

    async function persistLoggedInAccount() {
      try {
        const normalizedPhone =
          normalizePhoneForApi(sessionUser.phoneNumber) ??
          normalizePhoneForApi(requestedPhoneNumber);

        await createZaloAccount({
          zaloId: sessionUser.uid,
          phone: normalizedPhone,
          name: sessionUser.displayName || undefined,
        });

        if (!cancelled) {
          showToast("Đăng nhập Zalo thành công.", "success");
          await loadAccounts();
          await syncZaloSession();
          notifyZaloSessionChanged();
          handleCloseQrModal();
        }
      } catch (requestError) {
        if (cancelled) {
          return;
        }

        if (requestError instanceof ApiError && requestError.status === 409) {
          showToast("Tài khoản Zalo đã tồn tại trong hệ thống.", "warning");
          await loadAccounts();
          await syncZaloSession();
          notifyZaloSessionChanged();
          handleCloseQrModal();
          return;
        }

        setQrModalError(
          getErrorMessage(requestError, "Không thể lưu tài khoản Zalo vào hệ thống."),
        );
      } finally {
        if (!cancelled) {
          setSavingAccount(false);
        }
      }
    }

    void persistLoggedInAccount();

    return () => {
      cancelled = true;
    };
  }, [handleCloseQrModal, loadAccounts, qrLogin, requestedPhoneNumber, showToast, syncZaloSession]);

  // SECTION: PAGINATION / DERIVED STATE
  const totalPages = useMemo(() => {
    if (accounts.length === 0) {
      return 1;
    }

    return Math.ceil(accounts.length / PAGE_SIZE);
  }, [accounts.length]);

  const paginatedAccounts = useMemo(() => {
    const startIndex = (page - 1) * PAGE_SIZE;

    return accounts.slice(startIndex, startIndex + PAGE_SIZE);
  }, [accounts, page]);

  const visibleAccountIds = useMemo(
    () => paginatedAccounts.map((account) => account.id),
    [paginatedAccounts],
  );

  const selectedAccounts = useMemo(
    () => accounts.filter((account) => selectedAccountIds.includes(account.id)),
    [accounts, selectedAccountIds],
  );

  const allVisibleSelected =
    visibleAccountIds.length > 0 && visibleAccountIds.every((id) => selectedAccountIds.includes(id));
  const someVisibleSelected =
    visibleAccountIds.some((id) => selectedAccountIds.includes(id)) && !allVisibleSelected;

  const pageSummary = useMemo(() => {
    if (accounts.length === 0) {
      return "Chưa có dữ liệu";
    }

    const start = (page - 1) * PAGE_SIZE + 1;
    const end = Math.min(page * PAGE_SIZE, accounts.length);

    return `Hiển thị ${start}-${end} / ${accounts.length} tài khoản`;
  }, [accounts.length, page]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  useEffect(() => {
    const accountIds = new Set(accounts.map((account) => account.id));

    setSelectedAccountIds((currentSelectedIds) =>
      currentSelectedIds.filter((accountId) => accountIds.has(accountId)),
    );
  }, [accounts]);

  useEffect(() => {
    if (selectedAccountIds.length === 0) {
      setSelectedBulkAction("");
      setSelectedMasterAccountId("");
    }
  }, [selectedAccountIds.length]);

  useEffect(() => {
    if (
      selectedMasterAccountId &&
      !masterAccountOptions.some((account) => account.id === selectedMasterAccountId)
    ) {
      setSelectedMasterAccountId("");
    }
  }, [masterAccountOptions, selectedMasterAccountId]);

  useEffect(() => {
    if (selectAllVisibleCheckboxRef.current) {
      selectAllVisibleCheckboxRef.current.indeterminate = someVisibleSelected;
    }
  }, [someVisibleSelected]);

  // SECTION: ACCOUNT ACTIONS
  const handleSetMaster = async (accountId: string) => {
    try {
      await setZaloAccountMaster({ id: accountId });
      showToast("Đã cập nhật tài khoản master.", "success");
      await loadAccounts();
    } catch (requestError) {
      showToast(getErrorMessage(requestError, "Không thể đặt tài khoản chính."), "error");
    }
  };

  // SECTION: SCAN GROUPS
  // Quét danh sách nhóm từ phiên Zalo hiện tại rồi cập nhật lại vào account trong hệ thống.
  // Nếu account đang quét là master thì tiếp tục tạo/cập nhật Zalo groups bằng API bulk.
  const handleScanGroups = useCallback(async (accountId: string) => {
    const sessionResponse = await getCurrentZaloSession();
    const sessionList =
      sessionResponse.sessions.length > 0
        ? sessionResponse.sessions
        : sessionResponse.session
          ? [sessionResponse.session]
          : [];

    const latestAccounts = await getZaloAccounts();
    const targetAccount = latestAccounts.find((item) => item.id === accountId);

    if (!targetAccount) {
      showToast("Không tìm thấy tài khoản Zalo.", "error");
      return;
    }

    const matchingSession = sessionList.find((session) => session.user.uid === targetAccount.zaloId);

    if (!matchingSession) {
      showToast("Chưa có phiên Zalo cho tài khoản này. Vui lòng đăng nhập Zalo (QR) trước.", "error");
      return;
    }

    setScanGroupMessage("Đang quét tất cả nhóm Zalo...");
    setOpenModalScanningGroups(true);

    try {
      const response = await getAllGroups(matchingSession.id);
      const groupData = response.groups.gridVerMap;

      setScanGroupMessage("Đã quét xong!\nĐang cập nhật dữ liệu nhóm cho tài khoản zalo hiện tại...");

      await updateZaloAccountGroupData({ id: accountId, groupData: groupData });

      setScanGroupMessage("Đã cập nhật dữ liệu nhóm.\nĐang kiểm tra tài khoản đang quét có phải master hay không...");

      const latestAccounts = await getZaloAccounts();
      const currentAccount = latestAccounts.find((account) => account.id === accountId);
      const isMasterAccount = currentAccount?.isMaster ?? false;

      if (!isMasterAccount) {
        setScanGroupMessage("Đã cập nhật dữ liệu nhóm cho tài khoản hiện tại!\nTự động đóng popup sau 3 giây...");

        await loadAccounts();
        showToast("Đã cập nhật dữ liệu nhóm Zalo.", "success");
        closeScanGroupsModalAfterDelay();
        return;
      }

      const scannedGroupIds = Object.keys(groupData);

      if (scannedGroupIds.length === 0) {
        setScanGroupMessage("Đây là tài khoản master nhưng hiện chưa có nhóm nào để tạo.\nTự động đóng popup sau 3 giây...");

        await loadAccounts();
        showToast("Đã cập nhật dữ liệu nhóm Zalo. Không có nhóm mới để tạo.", "success");
        closeScanGroupsModalAfterDelay();
        return;
      }

      setScanGroupMessage("Đã xác nhận tài khoản master.\nĐang chuẩn bị dữ liệu nhóm Zalo để tạo trong hệ thống...");

      const groups = await buildBulkCreateGroupsPayload(groupData);

      setScanGroupMessage("Đang tạo nhóm Zalo trong hệ thống từ dữ liệu vừa quét...\nVui lòng chờ hoàn tất.");

      const bulkCreateResponse = await createZaloGroupsBulk(accountId, { groups });

      setScanGroupMessage(
        `Đã tạo nhóm Zalo xong!\nTạo mới: ${bulkCreateResponse.summary.created}, đã có sẵn: ${bulkCreateResponse.summary.skippedExisting}.\nTự động đóng popup sau 3 giây...`,
      );

      await loadAccounts();
      showToast("Đã quét và tạo nhóm Zalo cho tài khoản master.", "success");
      closeScanGroupsModalAfterDelay();
    } catch (requestError) {
      setScanGroupMessage("Quá trình quét hoặc tạo nhóm Zalo thất bại. Bạn có thể đóng popup và thử lại.");
      showToast(getErrorMessage(requestError, "Không thể quét nhóm Zalo."), "error");
    }
  }, [buildBulkCreateGroupsPayload, closeScanGroupsModalAfterDelay, loadAccounts, showToast]);

  // SECTION: BULK ACTIONS
  // Checkbox đầu bảng dùng để chọn nhanh các row đang hiển thị, phục vụ các thao tác hàng loạt như add child.
  const handleToggleAccountSelection = (accountId: string) => {
    setSelectedAccountIds((currentSelectedIds) =>
      currentSelectedIds.includes(accountId)
        ? currentSelectedIds.filter((currentId) => currentId !== accountId)
        : [...currentSelectedIds, accountId],
    );
  };

  const handleToggleSelectAllVisible = () => {
    const visibleAccountIdSet = new Set(visibleAccountIds);

    setSelectedAccountIds((currentSelectedIds) => {
      if (allVisibleSelected) {
        return currentSelectedIds.filter((accountId) => !visibleAccountIdSet.has(accountId));
      }

      return Array.from(new Set([...currentSelectedIds, ...visibleAccountIds]));
    });
  };

  const handleClearBulkSelection = () => {
    setSelectedAccountIds([]);
    setSelectedBulkAction("");
    setSelectedMasterAccountId("");
  };

  const handleApplyBulkAction = async () => {
    if (selectedBulkAction !== BULK_ACTION_ADD_CHILD) {
      return;
    }

    if (!selectedMasterAccountId) {
      showToast("Vui lòng chọn tài khoản master để thêm child.", "error");
      return;
    }

    if (selectedAccounts.length === 0) {
      showToast("Vui lòng chọn ít nhất một tài khoản.", "error");
      return;
    }

    if (selectedAccounts.some((account) => account.isMaster)) {
      showToast("Danh sách child không được chứa tài khoản master.", "error");
      return;
    }

    if (selectedAccountIds.includes(selectedMasterAccountId)) {
      showToast("Tài khoản master không thể đồng thời nằm trong danh sách child.", "error");
      return;
    }

    setSubmittingBulkAction(true);

    try {
      const response = await addChildZaloAccounts({
        masterId: selectedMasterAccountId,
        childIds: selectedAccounts.map((account) => account.id),
      });

      showToast(
        `Đã thêm ${response.summary.linked} child. Bỏ qua ${response.summary.skippedExisting} tài khoản đã tồn tại.`,
        "success",
      );
      handleClearBulkSelection();
      await loadAccounts();
    } catch (requestError) {
      showToast(getErrorMessage(requestError, "Không thể thêm các tài khoản child."), "error");
    } finally {
      setSubmittingBulkAction(false);
    }
  };

  const handleChangeAccountFilter = (nextFilter: ZaloAccountFilterType) => {
    setAccountFilter(nextFilter);
    setPage(1);
  };

  const handleOpenAccountDetails = (accountId: string) => {
    router.push(`/zalo-accounts/${accountId}`);
  };

  // SECTION: ROW ACTION MENU
  // Tập trung toàn bộ action hiển thị ở mỗi dòng để dễ tìm nơi thêm / bớt menu thao tác.
  const getActionItems = (account: ZaloAccount): ActionItem[] => {
    const items: ActionItem[] = [
      {
        label: "Quét nhóm Zalo",
        icon: <HiOutlineUserGroup />,
        onClick: () => handleScanGroups(account.id),
      },
      zaloLoggedIds.has(account.zaloId)
        ? {
            label: "Đăng xuất Zalo",
            icon: <HiOutlineArrowRightOnRectangle />,
            danger: true,
            onClick: () => void handleLogoutZaloForAccount(account),
          }
        : {
            label: "Đăng nhập Zalo",
            icon: <HiMiniQrCode />,
            onClick: () => void handleBeginQrLogin(account.phone),
          },
    ];

    if (!account.isMaster) {
      items.push({
        label: "Set Master",
        icon: <HiOutlineUserCircle />,
        onClick: () => handleSetMaster(account.id),
      });
    }

    if (account.isMaster) {
      items.push({
        label: "Xem chi tiết",
        icon: <HiMiniEye />,
        onClick: () => handleOpenAccountDetails(account.id),
      });
    }

    return items;
  };

  // SECTION: SEARCH
  const handleSearch = useCallback(async () => {
    try {
      if (!keywordSearch.trim()) {
        await loadAccounts();
        return;
      }

      const response = await searchZaloAccounts(keywordSearch);
      setAccounts(
        accountFilter === "all"
          ? response
          : response.filter((account) =>
              accountFilter === "master" ? account.isMaster : !account.isMaster,
            ),
      );
    } catch (requestError) {
      showToast(getErrorMessage(requestError, "Không thể tìm kiếm tài khoản Zalo."), "error");
    }
  }, [accountFilter, keywordSearch, loadAccounts, showToast]);

  // SECTION: RENDER
  return (
    <div className="flex-1 p-8">
      <PageHeader
        title="Danh sách tài khoản Zalo"
        description="Quản lý toàn bộ tài khoản Zalo trong hệ thống"
        actions={
          <Button
            startIcon={<HiMiniUserPlus className="h-5 w-5" />}
            onClick={() => handleOpenAddAccountModal()}
          >
            Thêm tài khoản Zalo
          </Button>
        }
      />

      {/* SECTION: SEARCH BAR + ACCOUNTS TABLE */}
      <div className="rounded-xl bg-surface-container-lowest shadow-sm shadow-slate-200/50">
        <div className="bg-surface-container-lowest pl-6 pr-6 py-4 rounded-xl">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            {(["all", "master", "child"] as const).map((type) => {
              const labels: Record<ZaloAccountFilterType, string> = {
                all: "Tất cả",
                master: "Master",
                child: "Child",
              };

              return (
                <Button
                  key={type}
                  size="sm"
                  variant={accountFilter === type ? "primary" : "outline"}
                  onClick={() => handleChangeAccountFilter(type)}
                >
                  {labels[type]}
                </Button>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <input
              className="w-80 rounded-xl border-none bg-surface-container-low py-2 pl-4 pr-4 text-sm transition-all placeholder:text-black focus:bg-white focus:ring-2 focus:ring-primary/20"
              placeholder="Tìm theo Tên / Số điện thoại"
              type="text"
              value={keywordSearch}
              onChange={(e) => setKeywordSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  void handleSearch();
                }
              }}
            />
            <Button
              className="h-9"
              startIcon={<HiOutlineFunnel className="h-5 w-5" />}
              onClick={() => void handleSearch()}
            >
              Tìm kiếm
            </Button> 
          </div>
        </div>

        {selectedAccountIds.length > 0 ? (
          <div className="flex flex-wrap items-center gap-3 border-t border-outline-variant/10 bg-surface-container-low px-6 py-4">
            <Badge variant="info" className="text-xs">
              Đã chọn {selectedAccountIds.length} tài khoản
            </Badge>

            <select
              className="h-10 min-w-[180px] rounded-lg border border-outline-variant/20 bg-white px-3 text-sm text-on-surface focus:border-primary focus:outline-none"
              value={selectedBulkAction}
              onChange={(event) => {
                setSelectedBulkAction(event.target.value);
                setSelectedMasterAccountId("");
              }}
            >
              <option value="">Chọn hành động</option>
              <option value={BULK_ACTION_ADD_CHILD}>Add child</option>
            </select>

            {selectedBulkAction === BULK_ACTION_ADD_CHILD ? (
              <select
                className="h-10 min-w-[220px] rounded-lg border border-outline-variant/20 bg-white px-3 text-sm text-on-surface focus:border-primary focus:outline-none"
                value={selectedMasterAccountId}
                onChange={(event) => setSelectedMasterAccountId(event.target.value)}
              >
                <option value="">Chọn tài khoản master</option>
                {masterAccountOptions.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name} {account.phone ? `- ${account.phone}` : ""}
                  </option>
                ))}
              </select>
            ) : null}

            <Button
              size="sm"
              loading={submittingBulkAction}
              disabled={
                selectedBulkAction === "" ||
                masterAccountOptions.length === 0 ||
                (selectedBulkAction === BULK_ACTION_ADD_CHILD && selectedMasterAccountId === "")
              }
              onClick={() => void handleApplyBulkAction()}
            >
              Thực hiện
            </Button>

            <Button
              size="sm"
              variant="outline"
              disabled={submittingBulkAction}
              onClick={handleClearBulkSelection}
            >
              Bỏ chọn
            </Button>
          </div>
        ) : null}

        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="bg-surface-container-low/50">
              <th className="px-6 py-3 text-label-sm tracking-wider text-on-surface font-normal">
                <input
                  ref={selectAllVisibleCheckboxRef}
                  checked={allVisibleSelected}
                  className="h-4 w-4 rounded border-outline-variant/30 text-primary focus:ring-primary"
                  type="checkbox"
                  aria-label="Chọn tất cả tài khoản đang hiển thị"
                  onChange={handleToggleSelectAllVisible}
                />
              </th>
              <th className="text-sm px-6 py-3 text-label-sm tracking-wider text-on-surface font-normal">
                Tên
              </th>
              <th className="text-sm px-6 py-3 text-label-sm tracking-wider text-on-surface font-normal">
                Số điện thoại
              </th>
              <th className="text-sm px-6 py-3 text-label-sm tracking-wider text-on-surface font-normal">
                Loại tài khoản
              </th>
              <th className="text-sm px-6 py-3 text-label-sm tracking-wider text-on-surface font-normal">
                Dữ liệu nhóm
              </th>
              <th className="text-sm px-6 py-3 text-label-sm tracking-wider text-on-surface font-normal">
                Số nhóm
              </th>
              <th className="text-sm px-6 py-3 text-label-sm tracking-wider text-on-surface font-normal">
                Ngày tạo
              </th>
              <th className="text-sm px-6 py-3 text-label-sm tracking-wider text-on-surface font-normal"></th>
            </tr>
          </thead>

          <tbody className="divide-y divide-outline-variant/10">
            {loading ? (
              <tr>
                <td colSpan={TABLE_COLUMN_COUNT} className="px-6 py-10 text-center text-sm text-on-surface-variant">
                  Đang tải danh sách tài khoản...
                </td>
              </tr>
            ) : accounts.length === 0 ? (
              <tr>
                <td colSpan={TABLE_COLUMN_COUNT} className="px-6 py-10 text-center text-sm text-on-surface-variant">
                  Chưa có tài khoản Zalo nào.
                </td>
              </tr>
            ) : (
              paginatedAccounts.map((account) => {
                // console.log(account.groupData);
                return (
                <>
                <tr
                  key={account.id}
                  className="group transition-colors hover:bg-surface-container-low/30"
                >
                  <td className="px-6 py-3">
                    <input
                      checked={selectedAccountIds.includes(account.id)}
                      className="h-4 w-4 rounded border-outline-variant/30 text-primary focus:ring-primary"
                      type="checkbox"
                      aria-label={`Chọn tài khoản ${account.name}`}
                      onChange={() => handleToggleAccountSelection(account.id)}
                    />
                  </td>
                  <td className="px-6 py-3">
                    <div className="body-md font-semibold text-on-surface text-sm">{account.name}</div>
                    {zaloLoggedIds.has(account.zaloId) ? (
                      <Badge variant="success" className="mt-1 text-xs" icon={<HiMiniFaceSmile />}>
                        Đang đăng nhập
                      </Badge>
                    ) : null}
                    {account.master ? (
                      <div className="mt-1 text-xs text-outline">
                        Thuộc master: {account.master.name}
                      </div>
                    ) : null}
                  </td>

                  <td className="px-6 py-3 text-sm">
                    <div className="body-md text-[#004ac6]">{account.phone || "-"}</div>
                  </td>

                  <td className="px-6 py-3">
                    {account.isMaster ? (
                      <Badge className="text-xs" variant="error">Master</Badge>
                    ) : (
                      <Badge className="text-xs" variant="default">Child</Badge>
                    )}               
                  </td>

                  <td className="px-6 py-3">
                    <div className="text-sm text-on-surface-variant">
                      {hasGroupData(account.groupData, account.id) ? (
                        <Badge className="text-xs" variant="success" icon={<HiOutlineCheckCircle />}>
                          Đã quét
                        </Badge>
                      ) : (
                        <Badge className="text-xs" variant="warning">Chưa quét</Badge>
                      )}
                    </div>
                  </td>

                  <td className="px-6 py-3 text-sm">
                    <span className="font-medium text-on-surface">{account.groupCount}</span>
                  </td>

                  <td className="px-6 py-3">
                    <div className="text-sm text-on-surface-variant">
                      {formatDate(account.createdAt)}
                    </div>
                  </td>

                  <td className="px-6 py-3 text-right">
                    <ActionMenu items={getActionItems(account)} />
                  </td>
                </tr>
                </>
              )}
            ))}
          </tbody>
        </table>

        <div className="flex flex-col gap-4 border-t border-outline-variant/10 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-xs text-on-surface-variant">{pageSummary}</div>

          <Pagination
            currentPage={page}
            totalPages={totalPages}
            onPageChange={setPage}
            disabled={loading}
          />
        </div>
      </div>

      {/* SECTION: ADD ACCOUNT MODAL */}
      <Modal
        open={openAddAccountModal}
        buttonText="Thêm tài khoản"
        buttonIcon={<HiMiniUserPlus className="h-5 w-5" />}
        title="Thêm tài khoản Zalo"
        onClose={handleCloseAddAccountModal}
        onSubmit={() => void handleSubmitPhoneNumber(phoneNumberRef.current?.value ?? "")}
        loading={submittingAddAccount}
        loadingText="Đang thêm tài khoản..."
      >
        <label className="mb-1.5 block text-sm font-medium text-on-surface-variant">
          Số điện thoại
        </label>
        <div className="relative">
          <input
            ref={phoneNumberRef}
            onFocus={() => setPhoneNumberError("")}
            className="w-full rounded-lg border-transparent bg-surface-container-low px-4 py-2.5 text-body-md transition-all placeholder:text-outline focus:border-primary focus:ring-2 focus:ring-primary-fixed"
            id="phone-number"
            placeholder="Nhập số điện thoại"
            type="text"
          />
          {phoneNumberError ? <FormError message={phoneNumberError} /> : null}
        </div>
      </Modal>

      {/* SECTION: QR LOGIN MODAL */}
      <Modal open={openQrModal} buttonText="" title="Mã QR" onClose={handleCloseQrModal}>
        <div className="flex flex-col items-center px-8 pb-8">
          <div className="relative aspect-square w-full max-w-[280px] rounded-2xl bg-surface-container-lowest p-6">
            <div className="flex h-full w-full items-center justify-center rounded-xl border border-outline-variant/10 bg-white shadow-[0_8px_30px_rgba(0,0,0,0.04)]">
              <div className="h-48 w-48 bg-white p-2">
                {qrCode ? (
                  <Image
                    className="h-full w-full"
                    src={qrCode}
                    alt="QR Code dang nhap Zalo"
                    width={192}
                    height={192}
                    unoptimized
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-sm text-outline">
                    Đang tải QR...
                  </div>
                )}
              </div>
            </div>
            <div className="absolute left-2 top-2 h-8 w-8 rounded-tl-lg border-l-2 border-t-2 border-primary" />
            <div className="absolute right-2 top-2 h-8 w-8 rounded-tr-lg border-r-2 border-t-2 border-primary" />
            <div className="absolute bottom-2 left-2 h-8 w-8 rounded-bl-lg border-b-2 border-l-2 border-primary" />
            <div className="absolute bottom-2 right-2 h-8 w-8 rounded-br-lg border-b-2 border-r-2 border-primary" />
          </div>

          <div className="mt-8 flex flex-col items-center gap-3">
            <div className="rounded-full bg-primary/5 px-4 py-2">
              <span className="text-sm font-medium tracking-tight text-primary">
                {qrLogin?.status === "authenticated"
                  ? "Đăng nhập thành công"
                  : qrLogin?.status === "scanned"
                    ? "Đã quét, đang xác thực..."
                    : "Chờ quét..."}
              </span>
            </div>
            <p className="body-md max-w-[260px] text-center text-on-surface-variant">
              Mở Zalo trên điện thoại và quét mã QR để đăng nhập tài khoản.
            </p>
            {qrLogin?.sessionUser ? (
              <div className="rounded-xl bg-surface-container-low px-4 py-3 text-center text-sm text-on-surface">
                <div className="font-semibold">{qrLogin.sessionUser.displayName}</div>
                <div className="mt-1 text-xs text-on-surface-variant">
                  {qrLogin.sessionUser.phoneNumber || "Không có số điện thoại"}
                </div>
                {requestedPhoneNumber &&
                qrLogin.sessionUser.phoneNumber &&
                !isSameVietnamesePhoneNumber(
                  qrLogin.sessionUser.phoneNumber,
                  requestedPhoneNumber,
                ) ? (
                  <div className="mt-2 text-xs text-error">
                    Số đã đăng nhập không khớp với số bạn nhập ban đầu.
                  </div>
                ) : null}
              </div>
            ) : null}
            {savingAccount ? (
              <div className="text-center text-sm text-on-surface-variant">
                Đang lưu tài khoản vào hệ thống...
              </div>
            ) : null}
            {qrModalError ? <div className="text-center text-sm text-error">{qrModalError}</div> : null}
          </div>

          <button
            className="group mt-6 flex items-center gap-2 text-sm font-semibold text-primary transition-colors hover:text-primary-container disabled:cursor-not-allowed disabled:opacity-60"
            onClick={() => void handleReloadQr()}
            type="button"
            disabled={reloadingQr}
          >
            <HiArrowPath
              className={[
                "h-5 w-5 transition-transform duration-500",
                reloadingQr ? "animate-spin" : "group-active:rotate-180",
              ].join(" ")}
            />
            {reloadingQr ? "Đang tải lại..." : "Tải lại QR Code"}
          </button>
        </div>
      </Modal>

      {/* SECTION: SCAN GROUPS MODAL */}
      <Modal
        open={openModalScanningGroups}
        title="Scan nhóm Zalo"
        onClose={handleCloseScanGroupsModal}
      >
        <div className="text-sm text-on-surface-variant">{scanGroupMessage}</div>
        <Badge variant="warning" icon={<HiOutlineExclamationTriangle />}>Vui lòng không đóng trang cho đến khi quét xong...</Badge>
      </Modal>
    </div>
  );
}