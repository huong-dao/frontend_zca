"use client";

import Image from "next/image";
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
import { createZaloAccount, getZaloAccounts, searchZaloAccounts, setZaloAccountMaster, updateZaloAccountGroupData } from "@/lib/api/zalo-accounts";
import { ApiError } from "@/lib/api/client";
import type { ZaloAccount } from "@/lib/api/types";
import {
  findUserByPhone,
  getAllGroups,
  getCurrentZaloSession,
  getQrLoginStatus,
  logoutZalo,
  notifyZaloSessionChanged,
  startQrLogin,
  ZALO_SESSION_CHANGED_EVENT,
  ZaloClientError,
} from "@/lib/zalo/client";
import type { PendingQrLoginSnapshot, PendingQrLoginStatus } from "@/lib/zalo/types";

const PAGE_SIZE = 20;
const TABLE_COLUMN_COUNT = 7;
const QR_FINISHED_STATUSES: PendingQrLoginStatus[] = [
  "authenticated",
  "expired",
  "declined",
  "error",
];

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

function hasGroupData(groupData: Record<string, string>) {
  return Object.keys(groupData).length > 0;
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export default function ZaloAccountsPage() {
  const { showToast } = useToast();
  const { user, loading: authLoading } = useAuth();
  const [openAddAccountModal, setOpenAddAccountModal] = useState(false);
  const [accounts, setAccounts] = useState<ZaloAccount[]>([]);
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
  const [checkingZaloSession, setCheckingZaloSession] = useState(false);
  const [submittingAddAccount, setSubmittingAddAccount] = useState(false);

  const phoneNumberRef = useRef<HTMLInputElement>(null);
  const persistedSessionIdRef = useRef<string | null>(null);
  const [zaloLoggedId, setZaloLoggedId] = useState<string | null>(null);

  const [keywordSearch, setKeywordSearch] = useState("");

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

  const syncZaloSession = useCallback(async () => {
    const response = await getCurrentZaloSession();
    const session = response.session;
    setZaloLoggedId(session?.user?.uid ?? null);
    return session;
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

  const loadAccounts = useCallback(async () => {
    setLoading(true);

    try {
      const response = await getZaloAccounts();
      setAccounts(response);
    } catch (requestError) {
      showToast(getErrorMessage(requestError, "Không thể tải danh sách tài khoản Zalo."), "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    void syncZaloSession().catch(() => {
      setZaloLoggedId(null);
    });

    const handleSessionChanged = () => {
      void syncZaloSession().catch(() => {
        setZaloLoggedId(null);
      });
    };

    window.addEventListener(ZALO_SESSION_CHANGED_EVENT, handleSessionChanged);
    return () => {
      window.removeEventListener(ZALO_SESSION_CHANGED_EVENT, handleSessionChanged);
    };
  }, [syncZaloSession]);

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
    } catch (requestError) {
      setQrModalError(getErrorMessage(requestError, "Không thể tạo mã QR đăng nhập."));
    } finally {
      if (isReload) {
        setReloadingQr(false);
      }
    }
  };

  const handleSubmitPhoneNumber = async (phoneNumber: string) => {
    setPhoneNumberError("");

    const normalizedPhoneNumber = normalizePhoneForApi(phoneNumber);

    if (!normalizedPhoneNumber || normalizedPhoneNumber.length !== 10) {
      setPhoneNumberError("Số điện thoại không hợp lệ");
      return;
    }

    setSubmittingAddAccount(true);

    try {
      const zaloSession = await syncZaloSession();

      if (!zaloSession) {
        setPhoneNumberError("Chưa có phiên đăng nhập Zalo");
        return;
      }

      const response = await findUserByPhone(normalizedPhoneNumber);
      const zaloUser = response.user;

      await createZaloAccount({
        zaloId: zaloUser.uid,
        phone: normalizedPhoneNumber,
        name: zaloUser.display_name || zaloUser.zalo_name || undefined,
      });

      showToast("Đã thêm tài khoản Zalo vào hệ thống.", "success");
      await loadAccounts();
      handleCloseAddAccountModal();
    } catch (requestError) {
      if (requestError instanceof ZaloClientError && requestError.status === 401) {
        setPhoneNumberError("Chưa có phiên đăng nhập Zalo");
        return;
      }

      if (requestError instanceof ApiError && requestError.status === 409) {
        setPhoneNumberError("Tài khoản Zalo đã tồn tại trong hệ thống.");
        return;
      }

      setPhoneNumberError(
        requestError instanceof Error ? requestError.message : "Không thể thêm tài khoản Zalo.",
      );
    } finally {
      setSubmittingAddAccount(false);
    }
  };

  const handleCloseAddAccountModal = useCallback(() => {
    setOpenAddAccountModal(false);
    setSubmittingAddAccount(false);
    resetAddAccountForm();
  }, [resetAddAccountForm]);

  const handleOpenAddAccountModal = async () => {
    resetAddAccountForm();
    setCheckingZaloSession(true);

    try {
      const zaloSession = await syncZaloSession();

      if (!zaloSession) {
        showToast("Chưa có phiên đăng nhập Zalo. Vui lòng đăng nhập Zalo trước.", "error");
        return;
      }

      setOpenAddAccountModal(true);
    } catch (requestError) {
      showToast(getErrorMessage(requestError, "Không thể kiểm tra phiên đăng nhập Zalo."), "error");
    } finally {
      setCheckingZaloSession(false);
    }
  };

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

  const handleLogoutZalo = async () => {
    try {
      await logoutZalo();
      setZaloLoggedId(null);
      handleCloseQrModal();
      showToast("Đăng xuất Zalo thành công.", "success");
    } catch (requestError) {
      showToast(getErrorMessage(requestError, "Không thể đăng xuất Zalo."), "error");
    }
  };

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
  }, [authLoading, loadAccounts, user]);

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

  const handleSetMaster = async (accountId: string) => {
    try {
      await setZaloAccountMaster({ id: accountId });
      showToast("Đã cập nhật tài khoản master.", "success");
      await loadAccounts();
    } catch (requestError) {
      showToast(getErrorMessage(requestError, "Không thể đặt tài khoản chính."), "error");
    }
  };

  const handleScanGroups = async (accountId: string) => {
    const zaloSession = await syncZaloSession();

    if (!zaloSession) {
      showToast("Chưa có phiên đăng nhập Zalo. Vui lòng đăng nhập Zalo trước.", "error");
      return;
    }

    setScanGroupMessage("Đang quét tất cả nhóm Zalo...");
    setOpenModalScanningGroups(true);

    try {
      const response = await getAllGroups();
      const groupData = response.groups.gridVerMap;

      setScanGroupMessage("Đã quét xong!\nĐang cập nhật dữ liệu nhóm cho tài khoản zalo hiện tại...");

      await updateZaloAccountGroupData({ id: accountId, groupData: groupData });

      setScanGroupMessage("Đã cập nhật dữ liệu nhóm cho tài khoản zalo hiện tại!\nTự động đóng popup sau 3 giây...");

      await loadAccounts();
      showToast("Đã cập nhật dữ liệu nhóm Zalo.", "success");

      setTimeout(() => {
        setOpenModalScanningGroups(false);
        setScanGroupMessage("");
      }, 3000);
      
    } catch (requestError) {
      showToast(getErrorMessage(requestError, "Không thể quét nhóm Zalo."), "error");
    }
  };

  const getActionItems = (account: ZaloAccount): ActionItem[] => {
    const items: ActionItem[] = [
      {
        label: "Quét nhóm Zalo",
        icon: <HiOutlineUserGroup />,
        onClick: () => handleScanGroups(account.id),
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
      items.push(
        zaloLoggedId === account.zaloId
          ? {
              label: "Đăng xuất Zalo",
              icon: <HiOutlineArrowRightOnRectangle />,
              danger: true,
              onClick: () => void handleLogoutZalo(),
            }
          : {
              label: "Đăng nhập Zalo",
              icon: <HiMiniQrCode />,
              onClick: () => void handleBeginQrLogin(account.phone),
            },
        {
          label: "Xem chi tiết",
          icon: <HiMiniEye />,
          onClick: () => console.log("view logs"),
        },
      );
    }

    return items;
  };

  const handleSearch = async () => {
    try {
      const response = await searchZaloAccounts(keywordSearch);
      setAccounts(response);
    } catch (requestError) {
      showToast(getErrorMessage(requestError, "Không thể tìm kiếm tài khoản Zalo."), "error");
    }
  };

  return (
    <div className="flex-1 p-8">
      <PageHeader
        title="Danh sách tài khoản Zalo"
        description="Quản lý toàn bộ tài khoản Zalo trong hệ thống"
        actions={
          <Button
            loading={checkingZaloSession}
            startIcon={<HiMiniUserPlus className="h-5 w-5" />}
            onClick={() => void handleOpenAddAccountModal()}
          >
            Thêm tài khoản Zalo
          </Button>
        }
      />

      <div className="rounded-xl bg-surface-container-lowest shadow-sm shadow-slate-200/50">
        <div className="bg-surface-container-lowest pl-6 pr-6 py-4 rounded-xl">
          <div className="flex items-center gap-2">
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
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="bg-surface-container-low/50">
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
                return (
                <tr
                  key={account.id}
                  className="group transition-colors hover:bg-surface-container-low/30"
                >
                  <td className="px-6 py-3">
                    <div className="body-md font-semibold text-on-surface text-sm">{account.name}</div>
                    {zaloLoggedId === account.zaloId ? (
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
                      {hasGroupData(account.groupData) ? (
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

      <Modal
        open={openModalScanningGroups}
        title="Scan nhóm Zalo"
      >
        <div className="text-sm text-on-surface-variant">{scanGroupMessage}</div>
        <Badge variant="warning" icon={<HiOutlineExclamationTriangle />}>Vui lòng không đóng trang cho đến khi quét xong...</Badge>
      </Modal>
    </div>
  );
}