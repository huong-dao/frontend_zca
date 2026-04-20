import "server-only";

import { Zalo, LoginQRCallbackEventType } from "zca-js";
import type { FetchAccountInfoResponse } from "zca-js";
import type { SerializedCookie } from "tough-cookie";
import type {
  ActiveZaloSession,
  PendingQrLoginSnapshot,
  StartQrLoginResponse,
  ZaloSessionCredentials,
  ZaloSessionUser,
} from "@/lib/zalo/types";
import {
  deleteAllZaloSessionsOnBackend,
  deleteZaloSessionOnBackend,
  upsertZaloSessionToBackend,
} from "@/lib/api/zalo-sessions";

export { ZALO_SESSION_COOKIE_NAME, ZALO_SESSIONS_COOKIE_NAME } from "@/lib/zalo/session-cookie";

const QR_READY_TIMEOUT_MS = 15_000;
const PENDING_TTL_MS = 10 * 60 * 1000;
const DEFAULT_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36";

type PendingQrLoginInternal = PendingQrLoginSnapshot;
type PendingQrLoginStoreItem = PendingQrLoginInternal;

type ZaloStore = {
  pendingLogins: Map<string, PendingQrLoginStoreItem>;
};

declare global {
  var __zcaZaloStore__: ZaloStore | undefined;
}

function getStore(): ZaloStore {
  if (!globalThis.__zcaZaloStore__) {
    globalThis.__zcaZaloStore__ = {
      pendingLogins: new Map<string, PendingQrLoginStoreItem>(),
    };
  }

  return globalThis.__zcaZaloStore__;
}

function nowIso() {
  return new Date().toISOString();
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function cleanupStore() {
  const store = getStore();
  const now = Date.now();

  for (const [id, pending] of store.pendingLogins) {
    const updatedAt = new Date(pending.updatedAt).getTime();

    if (now - updatedAt > PENDING_TTL_MS) {
      store.pendingLogins.delete(id);
    }
  }
}

function createPendingLogin(id: string): PendingQrLoginStoreItem {
  const timestamp = nowIso();

  return {
    id,
    status: "initializing",
    qrCode: null,
    error: null,
    scannedUser: null,
    sessionId: null,
    sessionUser: null,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

function updatePendingLogin(
  id: string,
  updater: (current: PendingQrLoginStoreItem) => PendingQrLoginStoreItem,
) {
  const store = getStore();
  const current = store.pendingLogins.get(id);

  if (!current) {
    return;
  }

  store.pendingLogins.set(id, updater(current));
}

function mapAccountToSessionUser(account: FetchAccountInfoResponse): ZaloSessionUser {
  return {
    uid: account.profile.userId,
    displayName: account.profile.displayName,
    zaloName: account.profile.zaloName,
    username: account.profile.username,
    phoneNumber: account.profile.phoneNumber,
    avatar: account.profile.avatar,
    cover: account.profile.cover,
  };
}

function ensureLoginCredentials(
  value: ZaloSessionCredentials | null,
): ZaloSessionCredentials {
  if (!value) {
    throw new Error("Không lấy được thông tin session từ login QR.");
  }

  return value;
}

async function runQrLoginFlow(loginId: string) {
  const store = getStore();
  const pending = store.pendingLogins.get(loginId);

  if (!pending) {
    return;
  }

  const zalo = new Zalo({
    selfListen: false,
    checkUpdate: true,
    logging: false,
  });

  let loginCredentials: ZaloSessionCredentials | null = null;

  try {
    const api = await zalo.loginQR(
      {
        userAgent: DEFAULT_USER_AGENT,
      },
      (event) => {
        const updatedAt = nowIso();

        if (event.type === LoginQRCallbackEventType.QRCodeGenerated) {
          updatePendingLogin(loginId, (current) => ({
            ...current,
            status: "qr_ready",
            qrCode: event.data.image,
            updatedAt,
          }));
          return;
        }

        if (event.type === LoginQRCallbackEventType.QRCodeScanned) {
          updatePendingLogin(loginId, (current) => ({
            ...current,
            status: "scanned",
            scannedUser: {
              displayName: event.data.display_name,
              avatar: event.data.avatar,
            },
            updatedAt,
          }));
          return;
        }

        if (event.type === LoginQRCallbackEventType.QRCodeDeclined) {
          updatePendingLogin(loginId, (current) => ({
            ...current,
            status: "declined",
            error: `QR bị từ chối (${event.data.code}).`,
            updatedAt,
          }));
          return;
        }

        if (event.type === LoginQRCallbackEventType.QRCodeExpired) {
          updatePendingLogin(loginId, (current) => ({
            ...current,
            status: "expired",
            error: "QR đã hết hạn. Vui lòng tạo lại.",
            updatedAt,
          }));
          return;
        }

        if (event.type === LoginQRCallbackEventType.GotLoginInfo) {
          loginCredentials = {
            imei: event.data.imei,
            userAgent: event.data.userAgent,
            cookies: event.data.cookie as SerializedCookie[],
          };
        }
      },
    );

    const resolvedLoginCredentials = ensureLoginCredentials(loginCredentials);
    const accountInfo = await api.fetchAccountInfo();
    const cookieJar = api.getCookie().serializeSync();
    const credentials: ZaloSessionCredentials = {
      imei: resolvedLoginCredentials.imei,
      userAgent: resolvedLoginCredentials.userAgent,
      cookies:
        (cookieJar?.cookies as SerializedCookie[] | undefined) ??
        resolvedLoginCredentials.cookies,
    };
    const sessionId = crypto.randomUUID();
    const timestamp = nowIso();
    const session: ActiveZaloSession = {
      id: sessionId,
      user: mapAccountToSessionUser(accountInfo),
      credentials,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    try {
      await upsertZaloSessionToBackend(session);
    } catch {
      // Phiên chỉ tồn tại trên client flow; không persist được DB.
    }

    updatePendingLogin(loginId, (current) => ({
      ...current,
      status: "authenticated",
      sessionId,
      sessionUser: session.user,
      updatedAt: timestamp,
    }));
  } catch (error) {
    updatePendingLogin(loginId, (current) => {
      if (current.status === "expired" || current.status === "declined") {
        return current;
      }

      return {
        ...current,
        status: "error",
        error: error instanceof Error ? error.message : "Không thể đăng nhập bằng QR.",
        updatedAt: nowIso(),
      };
    });
  }
}

export async function startQrLogin(): Promise<StartQrLoginResponse> {
  cleanupStore();

  const id = crypto.randomUUID();
  const pending = createPendingLogin(id);

  getStore().pendingLogins.set(id, pending);
  void runQrLoginFlow(id);

  const startedAt = Date.now();

  while (Date.now() - startedAt < QR_READY_TIMEOUT_MS) {
    const current = getStore().pendingLogins.get(id);

    if (!current) {
      break;
    }

    if (current.qrCode || current.status === "error") {
      return current;
    }

    await sleep(200);
  }

  return getStore().pendingLogins.get(id) ?? pending;
}

export function getQrLoginStatus(loginId: string) {
  cleanupStore();
  return getStore().pendingLogins.get(loginId) ?? null;
}

export async function removeZaloSession(sessionId: string) {
  try {
    await deleteZaloSessionOnBackend(sessionId);
  } catch {
    //
  }
}

export async function clearAllZaloSessions() {
  const store = getStore();
  store.pendingLogins.clear();

  try {
    await deleteAllZaloSessionsOnBackend();
  } catch {
    //
  }
}
