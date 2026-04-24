import { apiRequest } from "@/lib/api/client";
import type { ConfigEntry, PutConfigsBatchPayload } from "@/lib/api/types";

export function getConfigs() {
  return apiRequest<ConfigEntry[]>("/configs", {
    method: "GET",
  });
}

export function putConfigsBatch(data: PutConfigsBatchPayload) {
  return apiRequest<ConfigEntry[]>("/configs/batch", {
    method: "PUT",
    body: data,
  });
}
