import type {
  FindUserByPhoneResponse,
  GetFriendRequestStatusResponse,
  GetAllGroupsResponse,
  GetQrByUserIdResponse,
  LogoutZaloResponse,
  PendingQrLoginSnapshot,
  RemoveFriendResponse,
  SendFriendRequestResponse,
  StartQrLoginResponse,
  ZaloSessionResponse,
  getGroupInfoPayload,
} from "@/lib/zalo/types";
import {
  appendClientSessionId,
  clearClientZaloSessionState,
  getZaloClientSessionsHeaderValue,
  removeClientSessionId,
  setActiveClientSessionId,
  syncClientZaloSessionsFromServer,
} from "@/lib/zalo/client-session-storage";

export const ZALO_SESSION_CHANGED_EVENT = "zca:zalo-session-changed";

class ZaloClientError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ZaloClientError";
    this.status = status;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const merged = new Headers(init?.headers);

  if (!merged.has("Content-Type")) {
    merged.set("Content-Type", "application/json");
  }

  const clientSessions = typeof window !== "undefined" ? getZaloClientSessionsHeaderValue() : null;

  if (clientSessions) {
    merged.set("X-Zalo-Client-Sessions", clientSessions);
  }

  const response = await fetch(path, {
    ...init,
    credentials: "include",
    cache: "no-store",
    headers: merged,
  });

  const payload = (await response.json()) as { message?: string } & T;

  if (!response.ok) {
    throw new ZaloClientError(
      payload.message ?? `Request failed with status ${response.status}`,
      response.status,
    );
  }

  return payload;
}

export function startQrLogin() {
  return request<StartQrLoginResponse>("/api/zalo/login-qr", {
    method: "POST",
  });
}

export function getQrLoginStatus(loginId: string) {
  return request<PendingQrLoginSnapshot>(`/api/zalo/login-qr/${loginId}`, {
    method: "GET",
  });
}

export async function getCurrentZaloSession() {
  const data = await request<ZaloSessionResponse>("/api/zalo/session", {
    method: "GET",
  });

  const list =
    data.sessions.length > 0 ? data.sessions : data.session ? [data.session] : [];

  syncClientZaloSessionsFromServer(list, data.activeSessionId);

  return data;
}

/** Gắn cookie zca_zalo_* trên server (dùng sau khi QR thành công, khi Set-Cookie có thể bị mất). */
export async function bakeZaloSessionCookies(sessionId: string) {
  const result = await request<{ ok: true }>("/api/zalo/session/bake-cookies", {
    method: "POST",
    body: JSON.stringify({ sessionId }),
  });

  appendClientSessionId(sessionId);

  return result;
}

export async function setActiveZaloSession(sessionId: string) {
  const result = await request<{ success: boolean; activeSessionId: string }>("/api/zalo/session/active", {
    method: "POST",
    body: JSON.stringify({ sessionId }),
  });

  setActiveClientSessionId(sessionId);

  return result;
}

export function notifyZaloSessionChanged() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(ZALO_SESSION_CHANGED_EVENT));
  }
}

export async function logoutZalo(sessionId?: string) {
  const response = await request<LogoutZaloResponse>("/api/zalo/logout", {
    method: "POST",
    body: JSON.stringify(sessionId ? { sessionId } : {}),
  });

  if (sessionId) {
    removeClientSessionId(sessionId);
  } else {
    clearClientZaloSessionState();
  }

  notifyZaloSessionChanged();
  return response;
}

export function findUserByPhone(phoneNumber: string, sessionId?: string) {
  return request<FindUserByPhoneResponse>("/api/zalo/find-user", {
    method: "POST",
    body: JSON.stringify({ phoneNumber, sessionId }),
  });
}

export function getQrByUserId(userId?: string | string[], sessionId?: string) {
  return request<GetQrByUserIdResponse>("/api/zalo/get-qr", {
    method: "POST",
    body: JSON.stringify({ userId, sessionId }),
  });
}

export function sendFriendRequest(userId: string, message?: string, sessionId?: string) {
  return request<SendFriendRequestResponse>("/api/zalo/send-friend-request", {
    method: "POST",
    body: JSON.stringify({ userId, message, sessionId }),
  });
}

export function getFriendRequestStatus(friendId: string, sessionId?: string) {
  return request<GetFriendRequestStatusResponse>("/api/zalo/get-friend-request-status", {
    method: "POST",
    body: JSON.stringify({ friendId, sessionId }),
  });
}

export function removeFriend(friendId: string, sessionId?: string) {
  return request<{ result: RemoveFriendResponse }>("/api/zalo/remove-friend", {
    method: "POST",
    body: JSON.stringify({ friendId, sessionId }),
  });
}

export function getAllGroups(sessionId?: string) {
  const query = sessionId ? `?sessionId=${encodeURIComponent(sessionId)}` : "";
  return request<GetAllGroupsResponse>(`/api/zalo/get-all-groups${query}`, {
    method: "GET",
  });
}

export function getGroupInfo(groupId: string, sessionId?: string) {
  return request<getGroupInfoPayload>("/api/zalo/get-group-info", {
    method: "POST",
    body: JSON.stringify({ groupId, sessionId }),
  });
}

export { ZaloClientError };
