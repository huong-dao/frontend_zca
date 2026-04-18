"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import {
  getCurrentZaloSession,
  logoutZalo,
  ZALO_SESSION_CHANGED_EVENT,
} from "@/lib/zalo/client";
import { useToast } from "@/components/features/Toast";
import { HiMagnifyingGlass, HiOutlineArrowRightOnRectangle } from "react-icons/hi2";
import Button from "../ui/Button";

export default function Header() {
  const { showToast } = useToast();
  const [loggingOut, setLoggingOut] = useState(false);
  const [zaloUserAvatar, setZaloUserAvatar] = useState<string>("");
  const [zaloUserDisplayName, setZaloUserDisplayName] = useState<string>("");

  const loadZaloSession = useCallback(async () => {
    try {
      const response = await getCurrentZaloSession();
      setZaloUserAvatar(response.session?.user?.avatar ?? "");
      setZaloUserDisplayName(response.session?.user?.displayName ?? "");
    } catch {
      setZaloUserAvatar("");
      setZaloUserDisplayName("");
    }
  }, []);

  useEffect(() => {
    void loadZaloSession();

    const handleSessionChanged = () => {
      void loadZaloSession();
    };

    window.addEventListener(ZALO_SESSION_CHANGED_EVENT, handleSessionChanged);
    return () => {
      window.removeEventListener(ZALO_SESSION_CHANGED_EVENT, handleSessionChanged);
    };
  }, [loadZaloSession]);

  const handleLogout = async () => {
    setLoggingOut(true);

    try {
      await logoutZalo();
      showToast("Đăng xuất Zalo thành công.", "success");
      setZaloUserAvatar("");
      setZaloUserDisplayName("");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Không thể đăng xuất Zalo.", "error");
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <>
    {zaloUserAvatar ? (
    <header className="sticky top-0 z-40 flex h-16 items-center justify-between bg-white/80 px-8 shadow-sm shadow-slate-200/50 backdrop-blur-md dark:bg-slate-950/80">
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-4">
            <div className="flex gap-2">
              <div className="h-8 w-8 overflow-hidden rounded-full bg-slate-200">
                <Image
                  alt="Zalo User"
                  className="h-full w-full object-cover"
                  src={zaloUserAvatar}
                  width={32}
                  height={32}
                  unoptimized
                />
              </div>
              <div>
                <p className="text-xs font-normal text-black">Tài khoản Zalo</p>
                <p className="text-xs font-medium text-[#004ac6]">
                  {zaloUserDisplayName || "Chưa xác định"}
                </p>
              </div>
              <div className="ml-3">
                <Button
                  size="sm"
                  variant="destructive"
                  startIcon={<HiOutlineArrowRightOnRectangle />}
                  loading={loggingOut}
                  onClick={() => void handleLogout()}
                >
                  Đăng xuất Zalo
                </Button>
              </div>
            </div>
        </div>
      </div>
    </header>
    ) : null}
    </>
  );
}