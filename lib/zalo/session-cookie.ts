import "server-only";

/** Cookie legacy: một session đang active (giữ tương thích). */
export const ZALO_SESSION_COOKIE_NAME = "zca_zalo_session";

/** Cookie mới: danh sách session + session đang chọn. */
export const ZALO_SESSIONS_COOKIE_NAME = "zca_zalo_sessions";

export interface ZaloSessionsPayload {
  ids: string[];
  active: string | null;
}

const COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
};

export type ZaloCookieStore = {
  get: (name: string) => { value: string } | undefined;
  set: (name: string, value: string, options: typeof COOKIE_OPTIONS) => void;
  delete: (name: string) => void;
};

export function readZaloSessionsPayload(cookieStore: ZaloCookieStore): ZaloSessionsPayload {
  const raw = cookieStore.get(ZALO_SESSIONS_COOKIE_NAME)?.value;

  if (raw) {
    try {
      const parsed = JSON.parse(raw) as ZaloSessionsPayload;
      if (Array.isArray(parsed.ids)) {
        const ids = [...new Set(parsed.ids.filter((id): id is string => typeof id === "string" && id.length > 0))];
        const active =
          typeof parsed.active === "string" && ids.includes(parsed.active) ? parsed.active : ids[0] ?? null;

        return { ids, active };
      }
    } catch {
      // fall through to legacy
    }
  }

  const legacy = cookieStore.get(ZALO_SESSION_COOKIE_NAME)?.value;
  if (legacy) {
    return { ids: [legacy], active: legacy };
  }

  return { ids: [], active: null };
}

export function writeZaloSessionsCookie(cookieStore: ZaloCookieStore, payload: ZaloSessionsPayload) {
  const ids = [...new Set(payload.ids.filter(Boolean))];
  let active = payload.active;

  if (ids.length === 0) {
    cookieStore.delete(ZALO_SESSIONS_COOKIE_NAME);
    cookieStore.delete(ZALO_SESSION_COOKIE_NAME);
    return;
  }

  if (!active || !ids.includes(active)) {
    active = ids[0] ?? null;
  }

  const normalized: ZaloSessionsPayload = { ids, active };

  cookieStore.set(ZALO_SESSIONS_COOKIE_NAME, JSON.stringify(normalized), COOKIE_OPTIONS);

  if (active) {
    cookieStore.set(ZALO_SESSION_COOKIE_NAME, active, COOKIE_OPTIONS);
  }
}

export function addSessionToSessionsCookie(cookieStore: ZaloCookieStore, sessionId: string) {
  const current = readZaloSessionsPayload(cookieStore);
  const ids = current.ids.includes(sessionId) ? current.ids : [...current.ids, sessionId];
  writeZaloSessionsCookie(cookieStore, { ids, active: sessionId });
}

export function removeSessionFromSessionsCookie(cookieStore: ZaloCookieStore, sessionId: string) {
  const current = readZaloSessionsPayload(cookieStore);
  const ids = current.ids.filter((id) => id !== sessionId);
  let active = current.active;

  if (active === sessionId) {
    active = ids[0] ?? null;
  }

  writeZaloSessionsCookie(cookieStore, { ids, active });
}

export function resolveZaloSessionId(cookieStore: ZaloCookieStore, explicitSessionId?: string | null): string | null {
  const trimmed = explicitSessionId?.trim();
  if (trimmed) {
    return trimmed;
  }

  return readZaloSessionsPayload(cookieStore).active;
}
