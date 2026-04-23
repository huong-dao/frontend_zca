"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import {
  getCurrentZaloSession,
  logoutZalo,
  notifyZaloSessionChanged,
  setActiveZaloSession,
  ZALO_SESSION_CHANGED_EVENT,
} from "@/lib/zalo/client";
import { useToast } from "@/components/features/Toast";
import ZaloSessionCombobox from "@/components/features/ZaloSessionCombobox";
import { HiOutlineArrowRightOnRectangle } from "react-icons/hi2";
import Button from "../ui/Button";
import type { ZaloSessionPublic } from "@/lib/zalo/types";

export default function Header() {
  const { showToast } = useToast();
  const [loggingOut, setLoggingOut] = useState(false);
  const [loggingOutAll, setLoggingOutAll] = useState(false);
  const [sessions, setSessions] = useState<ZaloSessionPublic[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [sessionSwitching, setSessionSwitching] = useState(false);

  const loadZaloSession = useCallback(async () => {
    try {
      const response = await getCurrentZaloSession();
      const list =
        response.sessions.length > 0
          ? response.sessions
          : response.session
            ? [response.session]
            : [];
      setSessions(list);
      setActiveSessionId(response.activeSessionId);
    } catch {
      setSessions([]);
      setActiveSessionId(null);
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

  const handleChangeActiveSession = async (nextId: string) => {
    if (nextId === activeSessionId) {
      return;
    }
    setSessionSwitching(true);
    try {
      await setActiveZaloSession(nextId);
      notifyZaloSessionChanged();
      await loadZaloSession();
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Không thể đổi phiên Zalo.", "error");
    } finally {
      setSessionSwitching(false);
    }
  };

  const handleLogoutOne = async (sessionId: string) => {
    setLoggingOut(true);

    try {
      await logoutZalo(sessionId);
      showToast("Đã đăng xuất phiên Zalo này.", "success");
      await loadZaloSession();
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Không thể đăng xuất Zalo.", "error");
    } finally {
      setLoggingOut(false);
    }
  };

  const handleLogoutAll = async () => {
    setLoggingOutAll(true);

    try {
      await logoutZalo();
      showToast("Đã đăng xuất toàn bộ phiên Zalo.", "success");
      await loadZaloSession();
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Không thể đăng xuất Zalo.", "error");
    } finally {
      setLoggingOutAll(false);
    }
  };

  const activeSession = sessions.find((session) => session.id === activeSessionId) ?? sessions[0] ?? null;

  return sessions.length > 0 ? (
    <header className="sticky top-0 z-40 flex h-16 flex-wrap items-center justify-between gap-3 bg-white/80 px-8 shadow-sm shadow-slate-200/50 backdrop-blur-md dark:bg-slate-950/80">
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-4">
        <div className="flex min-w-0 items-center gap-3">
          {activeSession?.user.avatar ? (
            <div className="h-8 w-8 shrink-0 overflow-hidden rounded-full bg-slate-200">
              <Image
                alt="Zalo User"
                className="h-full w-full object-cover"
                src={activeSession.user.avatar}
                width={32}
                height={32}
                unoptimized
              />
            </div>
          ) : null}
          <div className="min-w-0">
            <p className="text-xs font-normal text-black">Phiên Zalo đang chọn</p>
            <p className="truncate text-xs font-medium text-[#004ac6]">
              {activeSession?.user.displayName || "Chưa xác định"}
            </p>
            <p className="text-[10px] text-on-surface-variant">
              {sessions.length} phiên đăng nhập
            </p>
          </div>
        </div>

        {sessions.length > 1 ? (
          <ZaloSessionCombobox
            sessions={sessions}
            activeSessionId={activeSessionId}
            onSelectSession={(nextId) => void handleChangeActiveSession(nextId)}
            switching={sessionSwitching}
          />
        ) : null}
      </div>

      <div className="flex shrink-0 flex-wrap items-center gap-2">
        <Button
          size="sm"
          variant="destructive"
          startIcon={<HiOutlineArrowRightOnRectangle />}
          loading={loggingOut}
          disabled={loggingOutAll || !activeSession}
          onClick={() => activeSession && void handleLogoutOne(activeSession.id)}
        >
          Đăng xuất phiên này
        </Button>
        <Button
          size="sm"
          variant="outline"
          loading={loggingOutAll}
          disabled={loggingOut}
          onClick={() => void handleLogoutAll()}
        >
          Đăng xuất tất cả
        </Button>
      </div>
    </header>
  ) : null;
}
