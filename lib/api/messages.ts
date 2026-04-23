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
  return apiRequest<SendMessageResponse>("/messages/send", {
    method: "POST",
    body: data,
  });
}
