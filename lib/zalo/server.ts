import "server-only";

import { Zalo, LoginQRCallbackEventType } from "zca-js";
import type { FetchAccountInfoResponse, FindUserResponse } from "zca-js";
import type { SerializedCookie } from "tough-cookie";
import type {
  ActiveZaloSession,
  PendingQrLoginSnapshot,
  StartQrLoginResponse,
  ZaloSessionCredentials,
  ZaloSessionUser,
} from "@/lib/zalo/types";

export const ZALO_SESSION_COOKIE_NAME = "zca_zalo_session";

const QR_READY_TIMEOUT_MS = 15_000;
const SESSION_TTL_MS = 12 * 60 * 60 * 1000;
const PENDING_TTL_MS = 10 * 60 * 1000;
const DEFAULT_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36";

type PendingQrLoginInternal = PendingQrLoginSnapshot;
type PendingQrLoginStoreItem = PendingQrLoginInternal & {
  previousSessionId?: string | null;
};

type ZaloStore = {
  activeSessions: Map<string, ActiveZaloSession>;
  pendingLogins: Map<string, PendingQrLoginStoreItem>;
};

declare global {
  var __zcaZaloStore__: ZaloStore | undefined;
}

function getStore(): ZaloStore {
  if (!globalThis.__zcaZaloStore__) {
    globalThis.__zcaZaloStore__ = {
      activeSessions: new Map<string, ActiveZaloSession>(),
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

  for (const [id, session] of store.activeSessions) {
    const updatedAt = new Date(session.updatedAt).getTime();

    if (now - updatedAt > SESSION_TTL_MS) {
      store.activeSessions.delete(id);
    }
  }

  for (const [id, pending] of store.pendingLogins) {
    const updatedAt = new Date(pending.updatedAt).getTime();

    if (now - updatedAt > PENDING_TTL_MS) {
      store.pendingLogins.delete(id);
    }
  }
}

function createPendingLogin(id: string, previousSessionId?: string | null): PendingQrLoginStoreItem {
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
    previousSessionId: previousSessionId ?? null,
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
    throw new Error("Khong lay duoc thong tin session tu login QR.");
  }

  return value;
}

function serializeSession(session: ActiveZaloSession) {
  return {
    id: session.id,
    user: session.user,
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
  };
}

function requireSession(sessionId: string | undefined | null) {
  cleanupStore();

  if (!sessionId) {
    throw new Error("Chua co phien Zalo dang dang nhap.");
  }

  const session = getStore().activeSessions.get(sessionId);

  if (!session) {
    throw new Error("Phien Zalo khong ton tai hoac da het han.");
  }

  return session;
}

async function createApiFromSession(session: ActiveZaloSession) {
  const zalo = new Zalo({
    selfListen: false,
    checkUpdate: true,
    logging: false,
  });

  return zalo.login({
    imei: session.credentials.imei,
    cookie: session.credentials.cookies,
    userAgent: session.credentials.userAgent,
  });
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
            error: `QR bi tu choi (${event.data.code}).`,
            updatedAt,
          }));
          return;
        }

        if (event.type === LoginQRCallbackEventType.QRCodeExpired) {
          updatePendingLogin(loginId, (current) => ({
            ...current,
            status: "expired",
            error: "QR da het han. Vui long tao lai.",
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

    store.activeSessions.set(sessionId, session);

    if (pending.previousSessionId && pending.previousSessionId !== sessionId) {
      store.activeSessions.delete(pending.previousSessionId);
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
        error: error instanceof Error ? error.message : "Khong the dang nhap bang QR.",
        updatedAt: nowIso(),
      };
    });
  }
}

export async function startQrLogin(previousSessionId?: string | null): Promise<StartQrLoginResponse> {
  cleanupStore();

  const id = crypto.randomUUID();
  const pending = createPendingLogin(id, previousSessionId);

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

export function getActiveSession(sessionId: string | undefined | null) {
  cleanupStore();

  if (!sessionId) {
    return null;
  }

  return getStore().activeSessions.get(sessionId) ?? null;
}

export async function findUserByPhone(
  phoneNumber: string,
  sessionId: string | undefined | null,
): Promise<FindUserResponse> {
  const session = requireSession(sessionId);
  const api = await createApiFromSession(session);
  const user = await api.findUser(phoneNumber);

  getStore().activeSessions.set(session.id, {
    ...session,
    updatedAt: nowIso(),
  });

  return user;
}

export async function getQrByUserId(
  userId: string | string[] | undefined,
  sessionId: string | undefined | null,
) {
  const session = requireSession(sessionId);
  const api = await createApiFromSession(session);

  if (!userId) {
    throw new Error("userId la bat buoc de lay ma QR.");
  }

  const qrCodes = await api.getQR(userId);

  getStore().activeSessions.set(session.id, {
    ...session,
    updatedAt: nowIso(),
  });

  return qrCodes;
}

export function getPublicSession(sessionId: string | undefined | null) {
  const session = getActiveSession(sessionId);

  if (!session) {
    return null;
  }

  return serializeSession(session);
}
