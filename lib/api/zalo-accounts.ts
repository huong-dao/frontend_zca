import { apiRequest } from "@/lib/api/client";
import type {
  CreateZaloAccountPayload,
  CreateZaloAccountResponse,
  SetZaloAccountMasterPayload,
  SetZaloAccountMasterResponse,
  UpdateZaloAccountGroupDataPayload,
  UpdateZaloAccountGroupDataResponse,
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

export function setZaloAccountMaster(data: SetZaloAccountMasterPayload) {
  return apiRequest<SetZaloAccountMasterResponse>(`/zalo-accounts/set-master/${data.id}`, {
    method: "PUT",
  });
}

export function updateZaloAccountGroupData(data: UpdateZaloAccountGroupDataPayload) {
  return apiRequest<UpdateZaloAccountGroupDataResponse>(`/zalo-accounts/${data.id}/group-data/`, {
    method: "PATCH",
    body: { groupData: data.groupData },
  });
}
