import { apiRequest } from "@/lib/api/client";
import type {
  MessageLog,
  MessageLogStatus,
  PaginatedResponse,
  SendMessagePayload,
  SendMessageResponse,
  UndoMessageResponse,
} from "@/lib/api/types";

/** Upload multipart + gọi Zalo nền có thể lâu; tăng nếu mạng rất chậm. */
export const MESSAGE_SEND_REQUEST_TIMEOUT_MS = 600_000;

export interface GetMessagesParams {
  page?: number;
  limit?: number;
  status?: MessageLogStatus;
}

export function getMessages(params: GetMessagesParams = {}) {
  const searchParams = new URLSearchParams();
  if (params.page) {
    searchParams.set("page", String(params.page));
  }
  if (params.limit) {
    searchParams.set("limit", String(params.limit));
  }
  if (params.status) {
    searchParams.set("status", params.status);
  }
  const queryString = searchParams.toString();

  return apiRequest<PaginatedResponse<MessageLog>>(`/messages${queryString ? `?${queryString}` : ""}`, {
    method: "GET",
  });
}

export function buildSendMessageFormData(data: SendMessagePayload): FormData {
  const formData = new FormData();
  formData.append("zaloAccountId", data.zaloAccountId);
  formData.append("groupId", data.groupId);
  formData.append("text", data.text ?? "");
  for (const file of data.files ?? []) {
    formData.append("files", file, file.name);
  }
  return formData;
}

export function sendMessage(data: SendMessagePayload) {
  return apiRequest<SendMessageResponse>("/messages/send", {
    method: "POST",
    body: buildSendMessageFormData(data),
    timeoutMs: MESSAGE_SEND_REQUEST_TIMEOUT_MS,
  });
}

/** POST `/messages/undo/:id` — thu hồi (undo Zalo, giữ bản ghi, `status: RECALL`). */
export function undoMessage(messageId: string) {
  return apiRequest<UndoMessageResponse>(`/messages/undo/${encodeURIComponent(messageId)}`, {
    method: "POST",
  });
}
