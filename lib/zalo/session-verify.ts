import {
  getCurrentZaloSession,
  notifyZaloSessionChanged,
  verifyZaloSession,
} from "@/lib/zalo/client";
import type { VerifyZaloSessionResponse, ZaloSessionPublic } from "@/lib/zalo/types";

/** Poll health-check phiên Zalo (3 phút). */
export const ZALO_SESSION_VERIFY_POLL_MS = 3 * 60 * 1000;

export function sessionDisplayName(session: ZaloSessionPublic) {
  return session.user.displayName || session.user.zaloName || session.user.uid;
}

export async function verifyAllZaloSessions(
  sessions: ZaloSessionPublic[],
): Promise<VerifyZaloSessionResponse[]> {
  if (sessions.length === 0) {
    return [];
  }

  const results = await Promise.all(sessions.map((session) => verifyZaloSession(session.id)));

  if (results.some((result) => result.sessionDeleted)) {
    notifyZaloSessionChanged();
  }

  return results;
}

export async function runZaloSessionHealthCheck(): Promise<{
  results: VerifyZaloSessionResponse[];
  deletedSessions: { session: ZaloSessionPublic; result: VerifyZaloSessionResponse }[];
}> {
  const response = await getCurrentZaloSession();
  const sessions =
    response.sessions.length > 0
      ? response.sessions
      : response.session
        ? [response.session]
        : [];

  if (sessions.length === 0) {
    return { results: [], deletedSessions: [] };
  }

  const results = await verifyAllZaloSessions(sessions);
  const deletedSessions = results
    .filter((result) => result.sessionDeleted)
    .map((result) => {
      const session = sessions.find((item) => item.id === result.sessionId);
      return session ? { session, result } : null;
    })
    .filter(
      (item): item is { session: ZaloSessionPublic; result: VerifyZaloSessionResponse } =>
        item !== null,
    );

  return { results, deletedSessions };
}

export async function ensureZaloSessionValid(
  sessionId: string,
  options?: { label?: string },
): Promise<{ ok: true } | { ok: false; reason: string }> {
  const result = await verifyZaloSession(sessionId);

  if (result.valid) {
    return { ok: true };
  }

  if (result.sessionDeleted) {
    notifyZaloSessionChanged();
  }

  const prefix = options?.label ? `${options.label}: ` : "";
  const reason =
    result.reason ??
    "Phiên Zalo đã hết hạn hoặc đã đăng nhập ở thiết bị khác. Vui lòng đăng nhập QR lại.";

  return { ok: false, reason: `${prefix}${reason}` };
}
