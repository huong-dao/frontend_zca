import "server-only";

/** Cookie legacy: một session đang active (giữ tương thích). */
export const ZALO_SESSION_COOKIE_NAME = "zca_zalo_session";

/** Cookie mới: danh sách session + session đang chọn. */
export const ZALO_SESSIONS_COOKIE_NAME = "zca_zalo_sessions";

export interface ZaloSessionsPayload {
  ids: string[];
  active: string | null;
}

/**
 * Cookie có `Secure` sẽ không được trình duyệt lưu khi site chỉ chạy HTTP (vd: http://IP:3001).
 * - Production HTTPS: mặc định secure=true (hoặc COOKIE_SECURE=true).
 * - Production HTTP: đặt COOKIE_SECURE=false, hoặc để NEXT_PUBLIC_* URL bắt đầu bằng http:// (tự suy ra).
 */
function zaloSessionCookieSecure(): boolean {
  const explicit = process.env.COOKIE_SECURE?.trim().toLowerCase();
  if (explicit === "false" || explicit === "0" || explicit === "no") {
    return false;
  }
  if (explicit === "true" || explicit === "1" || explicit === "yes") {
    return true;
  }

  const publicUrls = [process.env.NEXT_PUBLIC_APP_URL, process.env.NEXT_PUBLIC_API_BASE_URL].filter(
    Boolean,
  ) as string[];

  if (publicUrls.length > 0) {
    const allHttp = publicUrls.every((url) => url.startsWith("http://"));
    const anyHttps = publicUrls.some((url) => url.startsWith("https://"));
    if (allHttp && !anyHttps) {
      return false;
    }
    if (anyHttps) {
      return true;
    }
  }

  return process.env.NODE_ENV === "production";
}

function getCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: zaloSessionCookieSecure(),
    path: "/",
  };
}

export type ZaloCookieStore = {
  get: (name: string) => { value: string } | undefined;
  set: (name: string, value: string, options: ReturnType<typeof getCookieOptions>) => void;
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

  const opts = getCookieOptions();

  cookieStore.set(ZALO_SESSIONS_COOKIE_NAME, JSON.stringify(normalized), opts);

  if (active) {
    cookieStore.set(ZALO_SESSION_COOKIE_NAME, active, opts);
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
