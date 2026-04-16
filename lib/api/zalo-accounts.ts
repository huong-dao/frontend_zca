import { apiRequest } from "@/lib/api/client";
import type {
  CreateZaloAccountPayload,
  CreateZaloAccountResponse,
  ZaloAccount,
} from "@/lib/api/types";

export function getZaloAccounts() {
  return apiRequest<ZaloAccount[]>("/zalo-accounts", {
    method: "GET",
  });
}

export function createZaloAccount(data: CreateZaloAccountPayload) {
  return apiRequest<CreateZaloAccountResponse>("/zalo-accounts", {
    method: "POST",
    body: data,
  });
}
