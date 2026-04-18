"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { HiMiniUserPlus, HiArrowPath, HiMiniQrCode, HiOutlineUserGroup, HiMiniEye } from "react-icons/hi2";
import Modal from "@/components/features/Modal";
import PageHeader from "@/components/features/PageHeader";
import Pagination from "@/components/features/Pagination";
import Button from "@/components/ui/Button";
import FormError from "@/components/ui/FormError";
import Badge from "@/components/ui/Badge";
import { useAuth } from "@/contexts/AuthContext";
import { createZaloAccount, getZaloAccounts, setZaloAccountMaster, updateZaloAccountGroupData } from "@/lib/api/zalo-accounts";
import { ApiError } from "@/lib/api/client";
import type { ZaloAccount } from "@/lib/api/types";
import { getQrLoginStatus, startQrLogin, getAllGroups } from "@/lib/zalo/client";
import type { PendingQrLoginSnapshot } from "@/lib/zalo/types";
import { HiOutlineUserCircle, HiOutlineExclamationTriangle } from "react-icons/hi2";
import ActionMenu from "@/components/features/ActionMenu";

const PAGE_SIZE = 20;

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

export default function ZaloAccountsPage() {
  const { user, loading: authLoading } = useAuth();
  const [openAddAccountModal, setOpenAddAccountModal] = useState(false);
  const [accounts, setAccounts] = useState<ZaloAccount[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [phoneNumberError, setPhoneNumberError] = useState("");
  const [openQrModal, setOpenQrModal] = useState(false);
  const [creatingQr, setCreatingQr] = useState(false);
  const [reloadingQr, setReloadingQr] = useState(false);
  const [qrCode, setQrCode] = useState("");
  const [requestedPhoneNumber, setRequestedPhoneNumber] = useState("");
  const [qrModalError, setQrModalError] = useState("");
  const [qrLogin, setQrLogin] = useState<PendingQrLoginSnapshot | null>(null);
  const [savingAccount, setSavingAccount] = useState(false);
  const [saveAccountMessage, setSaveAccountMessage] = useState("");
  const [openModalScanningGroups, setOpenModalScanningGroups] = useState(false);
  const [scanGroupMessage, setScanGroupMessage] = useState("");

  const phoneNumberRef = useRef<HTMLInputElement>(null);
  const persistedSessionIdRef = useRef<string | null>(null);

  const beginQrLogin = async (phoneNumber: string, isReload = false) => {
    const setLoadingState = isReload ? setReloadingQr : setCreatingQr;
    setLoadingState(true);
    setQrModalError("");
    setSaveAccountMessage("");
    setSavingAccount(false);
    persistedSessionIdRef.current = null;

    try {
      const response = await startQrLogin();
      setRequestedPhoneNumber(phoneNumber);
      setQrLogin(response);
      setQrCode(response.qrCode ? normalizeQrImageSrc(response.qrCode) : "");
      if (response.status === "error" || response.status === "expired" || response.status === "declined") {
        setQrModalError(response.error ?? "Không thể tạo mã QR đăng nhập.");
      }
      setOpenQrModal(true);
      setOpenAddAccountModal(false);
    } catch (requestError) {
      const message =
        requestError instanceof Error ? requestError.message : "Không thể tạo mã QR đăng nhập.";

      if (isReload) {
        setQrModalError(message);
      } else {
        setPhoneNumberError(message);
      }
    } finally {
      setLoadingState(false);
    }
  };

  const handleSubmitPhoneNumber = async (phoneNumber: string) => {
    setPhoneNumberError("");
    setQrModalError("");
    // validate phone number 10 digits and not has empty space and is number
    if (phoneNumber.length !== 10 || phoneNumber.includes(" ") || isNaN(Number(phoneNumber))) {
      setPhoneNumberError("Số điện thoại không hợp lệ");
      return;
    }

    await beginQrLogin(phoneNumber);
  };

  const handleCloseAddAccountModal = () => {
    setOpenAddAccountModal(false);
    setPhoneNumberError("");
    if (phoneNumberRef.current) {
      phoneNumberRef.current.value = "";
    }
  };

  const handleCloseQrModal = () => {
    setOpenQrModal(false);
    setReloadingQr(false);
    setQrModalError("");
    setQrLogin(null);
    setQrCode("");
    setRequestedPhoneNumber("");
    setSavingAccount(false);
    setSaveAccountMessage("");
    persistedSessionIdRef.current = null;
  };

  const handleReloadQr = async () => {
    if (!requestedPhoneNumber) {
      return;
    }

    await beginQrLogin(requestedPhoneNumber, true);
  };

  useEffect(() => {
    if (!openQrModal || !qrLogin?.id) {
      return;
    }

    if (
      qrLogin.status === "authenticated" ||
      qrLogin.status === "expired" ||
      qrLogin.status === "declined" ||
      qrLogin.status === "error"
    ) {
      return;
    }

    const timer = window.setTimeout(async () => {
      try {
        const nextStatus = await getQrLoginStatus(qrLogin.id);
        setQrLogin(nextStatus);

        if (nextStatus.qrCode) {
          setQrCode(normalizeQrImageSrc(nextStatus.qrCode));
        }

        if (
          nextStatus.status === "expired" ||
          nextStatus.status === "declined" ||
          nextStatus.status === "error"
        ) {
          setQrModalError(nextStatus.error ?? "Phiên QR đã kết thúc.");
        }
      } catch (requestError) {
        setQrModalError(
          requestError instanceof Error ? requestError.message : "Không thể cập nhật trạng thái QR.",
        );
      }
    }, 1500);

    return () => {
      window.clearTimeout(timer);
    };
  }, [openQrModal, qrLogin]);

  const loadAccounts = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await getZaloAccounts();
      setAccounts(response);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Không thể tải danh sách tài khoản Zalo.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

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
    setSaveAccountMessage("");

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
          setSaveAccountMessage("Đã lưu tài khoản Zalo vào hệ thống.");
          await loadAccounts();

          // đóng Modal quét QR
          handleCloseQrModal();

          // lấy danh sách nhóm
          // const groups = await getAllGroups();
        }
      } catch (requestError) {
        if (cancelled) {
          return;
        }

        if (requestError instanceof ApiError && requestError.status === 409) {
          setSaveAccountMessage("Tài khoản Zalo đã tồn tại trong hệ thống.");
          
          // đóng Modal quét QR
          handleCloseQrModal();

          await loadAccounts();
          return;
        }

        setQrModalError(
          requestError instanceof Error
            ? requestError.message
            : "Không thể lưu tài khoản Zalo vào hệ thống.",
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
  }, [loadAccounts, qrLogin, requestedPhoneNumber]);

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
  
      // reload lại danh sách
      await loadAccounts();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Không thể đặt tài khoản chính."
      );
    }
  };

  const handleScanGroups = async (accountId: string) => {
    setScanGroupMessage("Đang quét tất cả nhóm Zalo...");
    setOpenModalScanningGroups(true);
    // setLoading(true);

    try {
      const response = await getAllGroups();
      const groupData = response.groups.gridVerMap;

      // set message đã quét xong
      setScanGroupMessage("Đã quét xong!\nĐang cập nhật dữ liệu nhóm cho tài khoản zalo hiện tại...");

      // update zalo account group data
      await updateZaloAccountGroupData({ id: accountId, groupData: groupData });

      // set message đã cập nhật dữ liệu nhóm
      setScanGroupMessage("Đã cập nhật dữ liệu nhóm cho tài khoản zalo hiện tại!\nTự động đóng popup sau 3 giây...");

      // đóng popup sau 3 giây
      setTimeout(() => {
        setOpenModalScanningGroups(false);
        setScanGroupMessage("");
      }, 3000);
      
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Không thể quét nhóm Zalo.");
    }
  };

  return (
    <div className="flex-1 p-8">
      <PageHeader
        title="Danh sách tài khoản Zalo"
        description="Quản lý toàn bộ tài khoản Zalo trong hệ thống"
        actions={
          <Button
            startIcon={<HiMiniUserPlus className="h-5 w-5" />}
            onClick={() => setOpenAddAccountModal(true)}
          >
            Thêm tài khoản Zalo
          </Button>
        }
      />

      <div className="rounded-xl bg-surface-container-lowest shadow-sm shadow-slate-200/50">
        {error ? (
          <div className="border-b border-error/20 bg-error/10 px-6 py-4 text-sm text-error">
            {error}
          </div>
        ) : null}

        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="bg-surface-container-low/50">
              <th className="px-6 py-4 text-label-sm font-bold tracking-wider text-on-surface-variant">
                Tên
              </th>
              <th className="px-6 py-4 text-label-sm font-bold tracking-wider text-on-surface-variant">
                Số điện thoại
              </th>
              <th className="px-6 py-4 text-label-sm font-bold tracking-wider text-on-surface-variant">
                Loại tài khoản
              </th>
              <th className="px-6 py-4 text-label-sm font-bold tracking-wider text-on-surface-variant">
                Số nhóm
              </th>
              <th className="px-6 py-4 text-label-sm font-bold tracking-wider text-on-surface-variant">
                Ngày tạo
              </th>
              <th className="px-6 py-4 text-label-sm font-bold tracking-wider text-on-surface-variant"></th>
            </tr>
          </thead>

          <tbody className="divide-y divide-outline-variant/10">
            {loading ? (
              <tr>
                <td colSpan={5} className="px-6 py-10 text-center text-sm text-on-surface-variant">
                  Đang tải danh sách tài khoản...
                </td>
              </tr>
            ) : accounts.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-10 text-center text-sm text-on-surface-variant">
                  Chưa có tài khoản Zalo nào.
                </td>
              </tr>
            ) : (
              paginatedAccounts.map((account) => (
                <tr
                  key={account.id}
                  className="group transition-colors hover:bg-surface-container-low/30"
                >
                  <td className="px-6 py-4">
                    <div className="body-md font-semibold text-on-surface">{account.name}</div>
                    {account.master ? (
                      <div className="mt-1 text-xs text-outline">
                        Thuoc master: {account.master.name}
                      </div>
                    ) : null}
                  </td>

                  <td className="px-6 py-4">
                    <div className="body-md text-[#004ac6]">{account.phone || "-"}</div>
                  </td>

                  <td className="px-6 py-4">
                    {account.isMaster ? (
                      <Badge variant="error">Master</Badge>
                    ) : (
                      <Badge variant="warning">Child</Badge>
                    )}               
                  </td>

                  <td className="px-6 py-4">
                    <span className="font-medium text-on-surface">{account.groupCount}</span>
                  </td>

                  <td className="px-6 py-4">
                    <div className="text-sm text-on-surface-variant">
                      {formatDate(account.createdAt)}
                    </div>
                  </td>

                  <td className="px-6 py-4 text-right">
                    <ActionMenu
                      items={[
                        {
                          label: "Set Master",
                          icon: <HiOutlineUserCircle />,
                          onClick: () => handleSetMaster(account.id),
                        },
                        {
                          label: "Quét nhóm Zalo",
                          icon: <HiOutlineUserGroup />,
                          onClick: () => handleScanGroups(account.id),
                        },
                        {
                          label: "Xem chi tiết",
                          icon: <HiMiniEye />,
                          onClick: () => console.log("view logs"),
                        },
                      ]}
                    />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        <div className="flex flex-col gap-4 border-t border-outline-variant/10 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-on-surface-variant">{pageSummary}</div>

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
        buttonText="Tạo mã QR"
        buttonIcon={<HiMiniQrCode className="h-5 w-5" />}
        title="Thêm tài khoản Zalo"
        onClose={handleCloseAddAccountModal}
        onSubmit={() => void handleSubmitPhoneNumber(phoneNumberRef.current?.value ?? "")}
        loading={creatingQr}
        loadingText="Đang tạo mã QR..."
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
            {saveAccountMessage ? (
              <div className="text-center text-sm text-primary">{saveAccountMessage}</div>
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