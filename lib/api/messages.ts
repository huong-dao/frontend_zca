import { apiRequest } from "@/lib/api/client";
import type { SendMessagePayload, SendMessageResponse } from "@/lib/api/types";

export function sendMessage(data: SendMessagePayload) {
  return apiRequest<SendMessageResponse>("/messages/send", {
    method: "POST",
    body: data,
  });
}
