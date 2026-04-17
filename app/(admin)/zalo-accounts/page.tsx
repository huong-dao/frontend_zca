"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { HiMiniUserPlus, HiArrowPath } from "react-icons/hi2";
import Modal from "@/components/features/Modal";
import PageHeader from "@/components/features/PageHeader";
import Button from "@/components/ui/Button";
import { useAuth } from "@/contexts/AuthContext";
import { createZaloAccount, getZaloAccounts } from "@/lib/api/zalo-accounts";
import { ApiError } from "@/lib/api/client";
import type { ZaloAccount } from "@/lib/api/types";
import { getQrLoginStatus, startQrLogin } from "@/lib/zalo/client";
import type { PendingQrLoginSnapshot } from "@/lib/zalo/types";

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

          // đóng Modal
          handleCloseQrModal();
        }
      } catch (requestError) {
        if (cancelled) {
          return;
        }

        if (requestError instanceof ApiError && requestError.status === 409) {
          setSaveAccountMessage("Tài khoản Zalo đã tồn tại trong hệ thống.");
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

  const accountCountLabel = useMemo(() => {
    if (loading) {
      return "Đang tải dữ liệu...";
    }

    return `${accounts.length} tài khoản`;
  }, [accounts.length, loading]);

  return (
    <div className="flex-1 overflow-y-auto p-8">
      <PageHeader
        title="Danh sách tài khoản Zalo"
        description={accountCountLabel}
        actions={
          <Button
            startIcon={<HiMiniUserPlus className="h-5 w-5" />}
            onClick={() => setOpenAddAccountModal(true)}
          >
            Thêm tài khoản Zalo
          </Button>
        }
      />

      <div className="overflow-hidden rounded-xl bg-surface-container-lowest shadow-sm shadow-slate-200/50">
        {error ? (
          <div className="border-b border-error/20 bg-error/10 px-6 py-4 text-sm text-error">
            {error}
          </div>
        ) : null}

        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="bg-surface-container-low/50">
              <th className="px-6 py-4 text-label-sm font-bold uppercase tracking-wider text-on-surface-variant">
                Tên
              </th>
              <th className="px-6 py-4 text-label-sm font-bold uppercase tracking-wider text-on-surface-variant">
                Số điện thoại / ID
              </th>
              <th className="px-6 py-4 text-label-sm font-bold uppercase tracking-wider text-on-surface-variant">
                Loại tài khoản
              </th>
              <th className="px-6 py-4 text-label-sm font-bold uppercase tracking-wider text-on-surface-variant">
                Số nhóm
              </th>
              <th className="px-6 py-4 text-label-sm font-bold uppercase tracking-wider text-on-surface-variant">
                Ngày tạo
              </th>
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
              accounts.map((account) => (
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
                    <div className="body-md text-on-surface">{account.phone || "-"}</div>
                    <div className="text-xs text-outline">{account.zaloId}</div>
                  </td>

                  <td className="px-6 py-4">
                    <span
                      className={[
                        "rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-tight",
                        account.isMaster
                          ? "bg-primary/10 text-primary"
                          : "bg-secondary-container/30 text-secondary",
                      ].join(" ")}
                    >
                      {account.isMaster ? "Master" : "Child"}
                    </span>
                  </td>

                  <td className="px-6 py-4">
                    <span className="font-medium text-on-surface">{account.groupCount}</span>
                  </td>

                  <td className="px-6 py-4">
                    <div className="text-sm text-on-surface-variant">
                      {formatDate(account.createdAt)}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Modal
        open={openAddAccountModal}
        buttonText="Tạo mã QR"
        title="Thêm tài khoản Zalo"
        onClose={handleCloseAddAccountModal}
        onSubmit={() => void handleSubmitPhoneNumber(phoneNumberRef.current?.value ?? "")}
        loading={creatingQr}
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
          {phoneNumberError ? <div className="mt-1 text-sm text-error">{phoneNumberError}</div> : null}
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
    </div>
  );
}