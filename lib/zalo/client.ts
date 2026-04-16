import type {
  FindUserByPhoneResponse,
  GetQrByUserIdResponse,
  PendingQrLoginSnapshot,
  StartQrLoginResponse,
  ZaloSessionResponse,
} from "@/lib/zalo/types";

class ZaloClientError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ZaloClientError";
    this.status = status;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    credentials: "include",
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
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

export function getCurrentZaloSession() {
  return request<ZaloSessionResponse>("/api/zalo/session", {
    method: "GET",
  });
}

export function findUserByPhone(phoneNumber: string) {
  return request<FindUserByPhoneResponse>("/api/zalo/find-user", {
    method: "POST",
    body: JSON.stringify({ phoneNumber }),
  });
}

export function getQrByUserId(userId?: string | string[]) {
  return request<GetQrByUserIdResponse>("/api/zalo/get-qr", {
    method: "POST",
    body: JSON.stringify({ userId }),
  });
}

export { ZaloClientError };
