"use client";

import { useCallback, useEffect, useRef, type ReactNode } from "react";
import { useToast } from "@/components/features/Toast";
import {
  runZaloSessionHealthCheck,
  sessionDisplayName,
  ZALO_SESSION_VERIFY_POLL_MS,
} from "@/lib/zalo/session-verify";

export function ZaloSessionHealthProvider({ children }: { children: ReactNode }) {
  const { showToast } = useToast();
  const checkingRef = useRef(false);

  const runCheck = useCallback(async () => {
    if (checkingRef.current) {
      return;
    }

    checkingRef.current = true;

    try {
      const { deletedSessions } = await runZaloSessionHealthCheck();

      for (const { session, result } of deletedSessions) {
        showToast(
          `${sessionDisplayName(session)}: ${result.reason ?? "Phiên Zalo đã hết hạn. Vui lòng đăng nhập QR lại."}`,
          "warning",
        );
      }
    } catch {
      // Bỏ qua lỗi mạng tạm thời; lần poll sau sẽ thử lại.
    } finally {
      checkingRef.current = false;
    }
  }, [showToast]);

  useEffect(() => {
    void runCheck();

    const intervalId = window.setInterval(() => {
      void runCheck();
    }, ZALO_SESSION_VERIFY_POLL_MS);

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void runCheck();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [runCheck]);

  return children;
}
