import "server-only";

import { serverApiRequest } from "@/lib/api/server-api";
import type { FindUserResponse, GroupInfoResponse } from "zca-js";
import type {
  GetAllGroupsResponse,
  GetFriendRequestStatusResponse,
  GetQrByUserIdResponse,
  SendFriendRequestResponse,
} from "@/lib/zalo/types";

/**
 * Proxy tới backend (cùng `NEXT_PUBLIC_API_BASE_URL`).
 * Backend load credentials từ DB theo `sessionId`, gọi zca-js và (tuỳ chọn) PATCH touch.
 *
 * Đường dẫn cố định — xem `.cursor/rules/zca-js-backend-handoff.mdc`.
 */
const P = "/zalo/actions";

export async function backendFindUserByPhone(sessionId: string, phoneNumber: string) {
  return serverApiRequest<{ user: FindUserResponse }>(`${P}/find-user`, {
    method: "POST",
    body: { sessionId, phoneNumber },
  });
}

export async function backendGetQrByUserId(sessionId: string, userId: string | string[]) {
  return serverApiRequest<GetQrByUserIdResponse>(`${P}/get-qr`, {
    method: "POST",
    body: { sessionId, userId },
  });
}

export async function backendSendFriendRequest(sessionId: string, userId: string, message?: string) {
  return serverApiRequest<SendFriendRequestResponse>(`${P}/send-friend-request`, {
    method: "POST",
    body: { sessionId, userId, message },
  });
}

export async function backendGetFriendRequestStatus(sessionId: string, friendId: string) {
  return serverApiRequest<GetFriendRequestStatusResponse>(`${P}/friend-request-status`, {
    method: "POST",
    body: { sessionId, friendId },
  });
}

export async function backendRemoveFriend(sessionId: string, friendId: string) {
  return serverApiRequest<{ result: string }>(`${P}/remove-friend`, {
    method: "POST",
    body: { sessionId, friendId },
  });
}

export async function backendGetAllGroups(sessionId: string) {
  return serverApiRequest<GetAllGroupsResponse>(
    `${P}/groups?sessionId=${encodeURIComponent(sessionId)}`,
    { method: "GET" },
  );
}

export async function backendGetGroupInfo(sessionId: string, groupId: string) {
  return serverApiRequest<{ groupInfo: GroupInfoResponse }>(`${P}/group-info`, {
    method: "POST",
    body: { sessionId, groupId },
  });
}
