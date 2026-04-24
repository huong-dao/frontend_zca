import { apiRequest } from "@/lib/api/client";
import type { MessageLog, MessageLogStatus, PaginatedResponse, SendMessagePayload, SendMessageResponse } from "@/lib/api/types";

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

export function sendMessage(data: SendMessagePayload) {
  const formData = new FormData();
  formData.append("zaloAccountId", data.zaloAccountId);
  formData.append("groupId", data.groupId);
  formData.append("text", data.text ?? "");
  for (const file of data.files ?? []) {
    formData.append("files", file, file.name);
  }
  return apiRequest<SendMessageResponse>("/messages/send", {
    method: "POST",
    body: formData,
  });
}

/** DELETE `/messages/:id` — đặt trạng thái RECALL (thu hồi ở mức app). */
export function recallMessage(messageId: string) {
  return apiRequest<MessageLog>(`/messages/${encodeURIComponent(messageId)}`, {
    method: "DELETE",
  });
}
