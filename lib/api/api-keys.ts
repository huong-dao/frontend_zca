import { apiRequest } from "@/lib/api/client";
import type { ApiKey, ApiMessageResponse, CreateApiKeyPayload } from "@/lib/api/types";

export function getApiKeys() {
  return apiRequest<ApiKey[]>("/api-keys", {
    method: "GET",
  });
}

export function createApiKey(payload: CreateApiKeyPayload) {
  return apiRequest<ApiKey>("/api-keys", {
    method: "POST",
    body: payload,
  });
}

export function deleteApiKey(id: string) {
  return apiRequest<ApiMessageResponse>(`/api-keys/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}
